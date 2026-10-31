import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildProvider } from '@/lib/telephony';
import { isWithinCallingHours, normalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

const Body = z.object({ leadId: z.string().uuid(), agentPhone: z.string().min(10) });

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  const { leadId } = parsed.data;
  const agentPhone = normalizePhone(parsed.data.agentPhone);
  if (!agentPhone) return NextResponse.json({ error: 'invalid_agent_phone' }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('id, company_id, role').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'profile_missing' }, { status: 403 });

  const { data: company } = await supabase.from('companies').select('timezone, calling_hours_start, calling_hours_end').eq('id', profile.company_id).single();
  if (company && !isWithinCallingHours(company.timezone, company.calling_hours_start, company.calling_hours_end)) {
    return NextResponse.json({ error: 'outside_calling_hours' }, { status: 409 });
  }

  const { data: lead, error: leadErr } = await supabase.from('leads').select('id, name, phone, is_dnc, company_id').eq('id', leadId).single();
  if (leadErr || !lead) return NextResponse.json({ error: 'lead_not_found' }, { status: 404 });
  if (lead.is_dnc) return NextResponse.json({ error: 'lead_is_dnc' }, { status: 409 });

  const customerPhone = normalizePhone(lead.phone);
  if (!customerPhone) return NextResponse.json({ error: 'invalid_lead_phone' }, { status: 422 });

  const { count: dncCount } = await supabase.from('dnc_numbers').select('id', { count: 'exact', head: true }).eq('phone', customerPhone);
  if ((dncCount ?? 0) > 0) return NextResponse.json({ error: 'number_on_dnc' }, { status: 409 });

  const { data: live } = await supabase.from('calls').select('id').eq('agent_id', user.id).in('status', ['initiated', 'ringing', 'in_progress']).maybeSingle();
  if (live) return NextResponse.json({ error: 'call_already_active', callId: live.id }, { status: 409 });

  const { data: cfg } = await supabase.from('telephony_configs').select('*').eq('company_id', profile.company_id).eq('is_active', true).order('created_at').limit(1).single();
  if (!cfg) return NextResponse.json({ error: 'telephony_not_configured' }, { status: 412 });

  const provider = buildProvider(cfg as any);
  const cb = process.env.APP_URL + '/api/webhooks/telephony/' + cfg.provider + '/' + cfg.webhook_token;

  const { data: call, error: callErr } = await supabase.from('calls').insert({
    company_id: profile.company_id, lead_id: lead.id, agent_id: user.id,
    telephony_config_id: cfg.id, provider: cfg.provider, direction: 'outbound',
    status: 'initiated', from_number: agentPhone, to_number: customerPhone,
    metadata: { agent_phone: agentPhone },
  }).select('id').single();
  if (callErr || !call) return NextResponse.json({ error: 'call_insert_failed', detail: callErr?.message }, { status: 500 });

  try {
    const result = await provider.clickToCall({
      agentPhone, customerPhone, callerId: cfg.caller_id ?? '',
      callId: call.id, statusCallbackUrl: cb, recordingCallbackUrl: cb,
    });
    await supabase.from('calls').update({ provider_call_id: result.providerCallId }).eq('id', call.id);
    return NextResponse.json({ callId: call.id, providerCallId: result.providerCallId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    await supabase.from('calls').update({ status: 'failed', ended_at: new Date().toISOString(), notes: message }).eq('id', call.id);
    return NextResponse.json({ error: 'provider_error', detail: message }, { status: 502 });
  }
}