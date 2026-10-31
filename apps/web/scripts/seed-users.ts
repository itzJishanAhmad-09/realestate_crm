import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

async function main() {
  config({ path: resolve(__dirname, "../.env.local") });

  const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
  const PASSWORD = "Test@12345";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
    process.exit(1);
  }
  console.log("Seeding project:", url);

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const users = [
    { email: "admin@acme.test",   role: "company_admin",   name: "Admin" },
    { email: "head@acme.test",    role: "sales_head",      name: "Sales Head" },
    { email: "leader@acme.test",  role: "team_leader",     name: "Team Leader" },
    { email: "caller1@acme.test", role: "telecaller",      name: "Caller One" },
    { email: "caller2@acme.test", role: "telecaller",      name: "Caller Two" },
    { email: "exec1@acme.test",   role: "sales_executive", name: "Exec One" },
  ];

  for (const u of users) {
    let userId;

    const created = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { company_id: COMPANY_ID, role: u.role, full_name: u.name },
    });

    if (created.error) {
      if (!/already|registered|exists/i.test(created.error.message)) {
        console.error("FAIL create", u.email, "-", created.error.message);
        continue;
      }
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
      if (!existing) { console.error("FAIL find", u.email); continue; }
      const updated = await admin.auth.admin.updateUserById(existing.id, {
        password: PASSWORD,
        email_confirm: true,
        ban_duration: "none",
      });
      if (updated.error) { console.error("FAIL update", u.email, "-", updated.error.message); continue; }
      userId = existing.id;
      console.log("reset", u.email);
    } else {
      userId = created.data.user.id;
      console.log("created", u.email);
    }

    const { error: profErr } = await admin.from("users").upsert(
      {
        id: userId,
        company_id: COMPANY_ID,
        email: u.email,
        full_name: u.name,
        role: u.role,
      },
      { onConflict: "id" },
    );
    if (profErr) console.error("FAIL public.users", u.email, "-", profErr.message);
    else console.log("  -> public.users OK");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });