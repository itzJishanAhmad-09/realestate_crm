import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isWithinCallingHours } from '@/lib/phone';

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: company } = await supabase
    .from('users').select('company_id, companies(timezone, calling_hours_start, calling_hours_end)')
    .eq('id', user.id).single();
  const c: any = (company as any)?.companies;
  if (c && !isWithinCallingHours(c.timezone, c.calling_hours_start, c.calling_hours_end)) {
    return NextResponse.json({ error: 'outside_calling_hours' }, { status: 409 });
  }

  const { data: next } = await supabase
    .from('call_queue_items')
    .select('id, lead_id, leads(id, name, phone, is_dnc, status_id)')
    .eq('agent_id', user.id).eq('status', 'pending').order('position').limit(1).maybeSingle();
  if (!next) return NextResponse.json({ done: true });
  return NextResponse.json({ item: next });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { leadIds } = await req.json() as { leadIds: string[] };
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: 'empty_queue' }, { status: 400 });
  }
  const { data: profile } = await supabase
    .from('users').select('company_id').eq('id', user.id).single();
  const rows = leadIds.map((leadId, i) => ({
    company_id: profile!.company_id, agent_id: user.id, lead_id: leadId, position: i,
  }));
  const { error } = await supabase.from('call_queue_items').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, queued: rows.length });
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { itemId, status } = await req.json() as { itemId: string; status: 'done' | 'skipped' };
  await supabase.from('call_queue_items').update({ status }).eq('id', itemId).eq('agent_id', user.id);
  return NextResponse.json({ ok: true });
}
