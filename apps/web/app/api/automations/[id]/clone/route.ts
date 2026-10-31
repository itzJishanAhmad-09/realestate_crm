import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: parent } = await supabase.from('automations').select('*').eq('id', params.id).single();
  if (!parent) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const nextVersion = (parent.version ?? 1) + 1;

  const { data, error } = await supabase.from('automations').insert({
    company_id: profile!.company_id,
    name: `${parent.name.replace(/ \(v\d+\)$/, '')} (v${nextVersion})`,
    description: parent.description,
    trigger_type: parent.trigger_type,
    trigger_config: parent.trigger_config,
    action_type: parent.action_type,
    action_config: parent.action_config,
    is_active: true,
    version: nextVersion,
    parent_automation_id: parent.parent_automation_id ?? parent.id,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Deactivate parent (keep history)
  await supabase.from('automations').update({ is_active: false }).eq('id', parent.id);
  return NextResponse.json({ ok: true, id: data.id, version: nextVersion });
}
