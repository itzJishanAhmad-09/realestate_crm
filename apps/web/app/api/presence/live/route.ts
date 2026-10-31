import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  const [{ data: presence }, { data: activeCalls }] = await Promise.all([
    supabase.from('user_presence')
      .select('user_id, status, last_seen_at, current_call_id, users(name, role)')
      .gte('last_seen_at', cutoff),
    supabase.from('calls')
      .select('id, agent_id, lead_id, status, started_at, leads(name, phone)')
      .in('status', ['initiated','ringing','in_progress']),
  ]);

  return NextResponse.json({
    presence: presence ?? [],
    activeCalls: activeCalls ?? [],
    asOf: new Date().toISOString(),
  });
}
