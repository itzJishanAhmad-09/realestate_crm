import { cookies } from "next/headers";
import {  createServerClient as createServerClientRaw, type CookieOptions } from '@supabase/ssr';

export function createSupabaseServer() {
  const store = cookies();
  return createServerClientRaw(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => store.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try { store.set({ name, value, ...options }); } catch { /* RSC */ }
        },
        remove: (name: string, options: CookieOptions) => {
          try { store.set({ name, value: "", ...options, maxAge: 0 }); } catch { /* ignore */ }
        },
      },
    },
  );
}

export const createClient = createSupabaseServer;

// Phase 2 compatibility: some routes import `createServerClient`
export const createServerClient = createSupabaseServer;
