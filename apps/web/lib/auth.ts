import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export type AuthedUser = {
  userId: string;
  email: string;
  fullName: string | null;
  role: "super_admin" | "company_admin" | "sales_head" | "team_leader" |
        "telecaller" | "sales_executive" | "channel_partner";
  companyId: string;
};

export async function requireUser(): Promise<AuthedUser> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id,email,full_name,role,company_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.company_id) redirect("/onboarding");

  return {
    userId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    companyId: profile.company_id,
  };
}
