import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export type ApiRole =
  | 'company_admin'
  | 'sales_head'
  | 'team_leader'
  | 'telecaller'
  | 'sales_exec';

export type ApiUser = {
  userId: string;
  companyId: string;
  role: ApiRole;
  supabase: ReturnType<typeof createServerClient>;
};

export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export async function requireApiUser(
  opts: { roles?: ApiRole[] } = {},
): Promise<ApiUser> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('unauthorized', 401);

  const { data: profile } = await supabase
    .from('users')
    .select('id, company_id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.company_id) throw new ApiError('profile_missing', 403);
  if (opts.roles && !opts.roles.includes(profile.role)) {
    throw new ApiError('forbidden', 403);
  }

  return {
    userId: user.id,
    companyId: profile.company_id,
    role: profile.role,
    supabase,
  };
}

export function apiHandler<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.code }, { status: err.status });
      }
      console.error('[api] unhandled', err);
      return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
  };
}
