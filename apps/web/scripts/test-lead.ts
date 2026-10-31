import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, ".env.local") });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // 1. Log in as Jishan
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "itzjishanahmad09@gmail.com",
    password: "shishi098"
  });
  if (authErr) { console.error("Login Failed:", authErr.message); process.exit(1); }

  // 2. Get the "New" status
  const { data: status, error: statusErr } = await supabase.from("lead_statuses").select("id").eq("key", "new").single();
  if (statusErr) { console.error("Status Fetch Failed:", statusErr.message); process.exit(1); }

  // 3. Try to insert the lead
  console.log("Attempting to insert lead...");
  const { data, error } = await supabase.from("leads").insert({
    company_id: "11111111-1111-1111-1111-111111111111",
    name: "Terminal Test Lead",
    phone: "+919759881077", 
    email: "test@test.com",
    budget_min: 5000000,
    budget_max: 8000000,
    status_id: status.id,
    created_by: auth.user.id
  }).select();

  if (error) {
    console.error("\n❌ INSERT FAILED!");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Details:", error.details);
    console.error("Hint:", error.hint);
  } else {
    console.log("\n✅ INSERT SUCCESSFUL!", data);
  }
}
run();