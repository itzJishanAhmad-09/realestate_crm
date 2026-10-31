import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildProvider } from '@/lib/telephony';
import { normalizePhone } from '@/lib/phone';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { provider: string; token: string } }) {
  const admin = createAdminClient();
  const { data: cfg } = await admin
    .from('telephony_configs').select('*')
    .eq('provider', params.provider).eq('webhook_token', params.token)
    .eq('is_active', true).maybeSingle();
  if (!cfg) return NextResponse.json({ error: 'unknown_webhook' }, { status: 404 });

  const contentType = req.headers.get('content-type') ?? '';
  let body: Record<string, string> = {};
  if (contentType.includes('application/json')) body = (await req.json()) as Record<string, string>;
  else {
    const form = await req.formData();
    for (const [k, v] of form.entries()) body[k] = String(v);
  }
  const query = Object.fromEntries(new URL(req.url).searchParams);
  const headers = Object.fromEntries(req.headers.entries());

  const provider = buildProvider(cfg as any);
  try { provider.verifyWebhook?.({ url: req.url, headers, query, body }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 403 }); }

  const event = provider.parseWebhook({ url: req.url, headers, query, body });
  if (!event) return NextResponse.json({ ok: true, ignored: true });

  const { data: existing } = await admin
    .from('calls').select('id, lead_id, agent_id, company_id, answered_at, started_at')
    .eq('provider', params.provider).eq('provider_call_id', event.providerCallId).maybeSingle();

  let callId = existing?.id;
  let leadId = existing?.lead_id ?? null;

  if (!callId && event.direction === 'inbound') {
    const phone = normalizePhone(event.fromNumber);
    let matchedLeadId: string | null = null;
    if (phone) {
      const { data: matched } = await admin
        .from('leads').select('id').eq('company_id', cfg.company_id).eq('phone', phone).limit(1).maybeSingle();
      matchedLeadId = matched?.id ?? null;
      if (!matchedLeadId) {
        const { data: created } = await admin.from('leads').insert({
          company_id: cfg.company_id, name: `Inbound ${phone}`, phone,
          source_id: null, assigned_to: null, remarks: 'Auto-created from inbound call',
        }).select('id').single();
        matchedLeadId = created?.id ?? null;
      }
    }
    const { data: newCall } = await admin.from('calls').insert({
      company_id: cfg.company_id, lead_id: matchedLeadId,
      provider: params.provider, provider_call_id: event.providerCallId,
      direction: 'inbound', status: event.status,
      from_number: event.fromNumber, to_number: event.toNumber,
      started_at: event.startedAt ?? new Date().toISOString(),
      metadata: { auto_matched: Boolean(matchedLeadId) },
    }).select('id, lead_id').single();
    callId = newCall?.id;
    leadId = newCall?.lead_id ?? null;
  }
  if (!callId) return NextResponse.json({ ok: true, orphan: true });

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: event.status,
    from_number: event.fromNumber ?? undefined,
    to_number: event.toNumber ?? undefined,
  };
  if (event.status === 'in_progress' && !existing?.answered_at) patch.answered_at = nowIso;
  if (['completed', 'failed', 'canceled'].includes(event.status)) {
    patch.ended_at = event.endedAt ?? nowIso;
    if (event.durationSec != null) patch.talk_time_sec = event.durationSec;
  }
  if (event.recordingUrl) patch.recording_url = event.recordingUrl;
  await admin.from('calls').update(patch).eq('id', callId);

  if (event.status === 'completed' && leadId) {
    try { await admin.rpc("increment_lead_call_stats", { p_lead_id: leadId }); } catch {}
    await admin.from('activity_log').insert({
      company_id: cfg.company_id, entity_type: 'lead', entity_id: leadId, actor_id: null,
      action: 'call_completed', meta: { call_id: callId, duration_sec: event.durationSec ?? 0 },
    });
  }
  return NextResponse.json({ ok: true });
}
