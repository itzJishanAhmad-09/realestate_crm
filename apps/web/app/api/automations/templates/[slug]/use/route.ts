import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(_req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { data: template, error: tErr } = await supabase.from('automation_templates')
    .select('*').eq('slug', params.slug).maybeSingle();
  if (tErr || !template) return NextResponse.json({ error: 'template_not_found' }, { status: 404 });

  const { data, error } = await supabase.from('automations').insert({
    company_id: profile!.company_id,
    name: template.name,
    description: template.description,
    trigger_type: template.trigger_type,
    trigger_config: template.trigger_config,
    action_type: template.action_type,
    action_config: template.action_config,
    is_active: true,
    version: 1,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
