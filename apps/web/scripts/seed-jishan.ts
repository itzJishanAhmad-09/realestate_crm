import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Missing env vars"); process.exit(1); }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const EMAIL     = "itzjishanahmad09@gmail.com";
  const PASSWORD  = "shishi098";
  const FULL_NAME = "Jishan Ahmad";
  const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
  // Try marketing_manager first; fall back to company_admin if enum rejects it
  let ROLE = "marketing_manager";

  let userId;

  const created = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { company_id: COMPANY_ID, role: ROLE, full_name: FULL_NAME },
  });

  if (created.error) {
    if (!/already|registered|exists/i.test(created.error.message)) {
      console.error("FAIL create:", created.error.message);
      process.exit(1);
    }
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((x) => x.email?.toLowerCase() === EMAIL.toLowerCase());
    if (!existing) { console.error("FAIL: user exists but not found"); process.exit(1); }
    const updated = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      ban_duration: "none",
    });
    if (updated.error) { console.error("FAIL update:", updated.error.message); process.exit(1); }
    userId = existing.id;
    console.log("reset", EMAIL);
  } else {
    userId = created.data.user.id;
    console.log("created", EMAIL);
  }

  // Try to write public.users with marketing_manager; if enum rejects, use company_admin
  let profErr = (await admin.from("users").upsert({
    id: userId, company_id: COMPANY_ID, email: EMAIL, full_name: FULL_NAME, role: ROLE,
  }, { onConflict: "id" })).error;

  if (profErr && /invalid input value for enum/i.test(profErr.message)) {
    console.log("  (marketing_manager not in enum — falling back to company_admin)");
    ROLE = "company_admin";
    profErr = (await admin.from("users").upsert({
      id: userId, company_id: COMPANY_ID, email: EMAIL, full_name: FULL_NAME, role: ROLE,
    }, { onConflict: "id" })).error;
  }

  if (profErr) { console.error("FAIL public.users:", profErr.message); process.exit(1); }

  console.log("  -> public.users OK (role:", ROLE + ")");
  console.log("");
  console.log("─────────────────────────────────────────────");
  console.log("  LOGIN CREDENTIALS");
  console.log("  Email:    " + EMAIL);
  console.log("  Password: " + PASSWORD);
  console.log("  Role:     " + ROLE);
  console.log("─────────────────────────────────────────────");
}

main().catch((e) => { console.error(e); process.exit(1); });