import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Body = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  assignedTo: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
  if (!profile || !['company_admin','sales_head','team_leader'].includes(profile.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('leads')
    .update({ assigned_to: parsed.data.assignedTo })
    .in('id', parsed.data.leadIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, count: parsed.data.leadIds.length });
}
