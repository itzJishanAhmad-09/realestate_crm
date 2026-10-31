import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Body = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.enum(['lead_created','lead_status_changed','lead_assigned','site_visit_scheduled','site_visit_completed','follow_up_due']),
  triggerConfig: z.record(z.string(), z.any()).default({}),
  actionType: z.enum(['send_wa_template','send_sms_template','create_followup','assign_user','add_tag','set_status','create_reminder']),
  actionConfig: z.record(z.string(), z.any()).default({}),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase.from('automations').select('*').order('order_index');
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { data, error } = await supabase.from('automations').insert({
    company_id: profile!.company_id,
    name: parsed.data.name, description: parsed.data.description ?? null,
    trigger_type: parsed.data.triggerType, trigger_config: parsed.data.triggerConfig,
    action_type: parsed.data.actionType, action_config: parsed.data.actionConfig,
    is_active: parsed.data.isActive,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
