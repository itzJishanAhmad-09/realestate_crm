import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';

const Body = z.object({
  name: z.string().min(1),
  channel: z.enum(['whatsapp','sms']),
  waTemplateId: z.string().uuid().optional(),
  smsTemplateId: z.string().uuid().optional(),
  filter: z.object({
    status_id: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
    source_id: z.string().uuid().optional(),
    assigned_to: z.string().uuid().optional(),
  }).default({}),
});

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const companyId = profile!.company_id;

  const { data: campaign, error } = await supabase.from('campaigns').insert({
    company_id: companyId, name: parsed.data.name, channel: parsed.data.channel,
    wa_template_id: parsed.data.waTemplateId ?? null,
    sms_template_id: parsed.data.smsTemplateId ?? null,
    filter: parsed.data.filter, status: 'draft', created_by: user.id,
  }).select('id').single();
  if (error || !campaign) return NextResponse.json({ error: error?.message ?? 'insert_failed' }, { status: 500 });

  // resolve leads from filter
  let q = supabase.from('leads').select('id, phone').eq('company_id', companyId).eq('is_dnc', false).limit(2000);
  const f = parsed.data.filter;
  if (f.status_id) q = q.eq('status_id', f.status_id);
  if (f.project_id) q = q.eq('project_id', f.project_id);
  if (f.source_id) q = q.eq('source_id', f.source_id);
  if (f.assigned_to) q = q.eq('assigned_to', f.assigned_to);

  const { data: leads } = await q;
  const rows = (leads ?? [])
    .filter((l) => normalizePhone(l.phone))
    .map((l) => ({ campaign_id: campaign.id, company_id: companyId, lead_id: l.id, phone: l.phone }));

  if (rows.length > 0) {
    await supabase.from('campaign_recipients').insert(rows);
  }
  await supabase.from('campaigns').update({ total_recipients: rows.length }).eq('id', campaign.id);

  return NextResponse.json({ ok: true, id: campaign.id, totalRecipients: rows.length });
}
