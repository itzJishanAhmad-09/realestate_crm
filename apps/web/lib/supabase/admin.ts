import { createClient as sb } from "@supabase/supabase-js";

export function createAdminClient() {
  if (typeof window !== "undefined") throw new Error("admin client is server-only");
  return sb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Phase 2: backwards-compatible alias used by Phase 1 webhook routes
export const createSupabaseAdmin = createAdminClient;
