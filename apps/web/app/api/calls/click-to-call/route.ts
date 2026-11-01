import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler, requireApiUser, ApiError } from '@/lib/api/require-user';
import { buildProvider } from '@/lib/telephony';
import { isWithinCallingHours, normalizePhone } from '@/lib/phone';
import { logAudit } from '@/lib/audit/log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  leadId: z.string().uuid(),
  agentPhone: z.string().min(10),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const { supabase, companyId, userId } = await requireApiUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new ApiError('invalid_body', 400);

  const agentPhone = normalizePhone(parsed.data.agentPhone);
  if (!agentPhone) throw new ApiError('invalid_agent_phone', 400);

  const { data: company } = await supabase
    .from('companies')
    .select('timezone, calling_hours_start, calling_hours_end')
    .eq('id', companyId)
    .single();
  if (company && !isWithinCallingHours(
    company.timezone ?? 'Asia/Kolkata',
    company.calling_hours_start ?? '09:00',
    company.calling_hours_end ?? '21:00',
  )) {
    throw new ApiError('outside_calling_hours', 409);
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, phone, is_dnc')
    .eq('id', parsed.data.leadId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (!lead) throw new ApiError('lead_not_found', 404);
  if (lead.is_dnc) throw new ApiError('lead_is_dnc', 409);

  const customerPhone = normalizePhone(lead.phone);
  if (!customerPhone) throw new ApiError('invalid_lead_phone', 422);

  const { count: dncCount } = await supabase
    .from('dnc_numbers')
    .select('id', { count: 'exact', head: true })
    .eq('phone', customerPhone);
  if ((dncCount ?? 0) > 0) throw new ApiError('number_on_dnc', 409);

  const { data: live } = await supabase
    .from('calls')
    .select('id')
    .eq('agent_id', userId)
    .in('status', ['initiated', 'ringing', 'in_progress'])
    .maybeSingle();
  if (live) return NextResponse.json({ error: 'call_already_active', callId: live.id }, { status: 409 });

  const { data: cfg } = await supabase
    .from('telephony_configs')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (!cfg) throw new ApiError('telephony_not_configured', 412);

  const provider = buildProvider(cfg as any);
  const cb = `${process.env.APP_URL}/api/webhooks/telephony/${cfg.provider}/${cfg.webhook_token}`;

  const { data: call, error: callErr } = await supabase
    .from('calls')
    .insert({
      company_id: companyId,
      lead_id: lead.id,
      agent_id: userId,
      telephony_config_id: cfg.id,
      provider: cfg.provider,
      direction: 'outbound',
      status: 'initiated',
      from_number: agentPhone,
      to_number: customerPhone,
      metadata: { agent_phone: agentPhone },
    })
    .select('id')
    .single();
  if (callErr || !call) throw new ApiError('call_insert_failed', 500);

  try {
    const result = await provider.clickToCall({
      agentPhone,
      customerPhone,
      callerId: cfg.caller_id ?? '',
      callId: call.id,
      statusCallbackUrl: cb,
      recordingCallbackUrl: cb,
    });
    await supabase.from('calls').update({ provider_call_id: result.providerCallId }).eq('id', call.id);

    await logAudit(supabase, {
      companyId, actorId: userId, entity: 'call', entityId: call.id,
      action: 'initiated', meta: { leadId: lead.id, provider: cfg.provider },
    });

    return NextResponse.json({ callId: call.id, providerCallId: result.providerCallId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    await supabase
      .from('calls')
      .update({ status: 'failed', ended_at: new Date().toISOString(), notes: message })
      .eq('id', call.id);
    throw new ApiError('provider_error', 502);
  }
});
