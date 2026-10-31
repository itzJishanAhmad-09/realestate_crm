import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/phone';

export const runtime = 'nodejs';

/** GET — Meta verification handshake */
export async function GET(req: NextRequest, { params }: { params: { provider: string; token: string } }) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const challenge = url.searchParams.get('hub.challenge');
  const verifyToken = url.searchParams.get('hub.verify_token');
  if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}

/** POST — inbound message */
export async function POST(req: NextRequest, { params }: { params: { provider: string; token: string } }) {
  const admin = createAdminClient();
  const { data: cfg } = await admin.from('messaging_configs').select('*')
    .eq('provider', params.provider).eq('webhook_token', params.token).eq('is_active', true).maybeSingle();
  if (!cfg) return NextResponse.json({ error: 'unknown_webhook' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true, ignored: true });

  // Meta Cloud format: entry[].changes[].value.messages[]
  const entries = (body as any)?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      for (const msg of messages) {
        const from = normalizePhone(msg.from);
        if (!from) continue;
        const text = msg.text?.body ?? msg.button?.text ?? '';

        const { data: lead } = await admin.from('leads').select('id')
          .eq('company_id', cfg.company_id).eq('phone', from).limit(1).maybeSingle();

        await admin.from('messages').insert({
          company_id: cfg.company_id, lead_id: lead?.id ?? null,
          channel: 'whatsapp', direction: 'inbound', from_number: from,
          body: text, provider: params.provider,
          provider_message_id: msg.id, status: 'received',
          metadata: { raw: msg },
        });

        // Also log on lead timeline if matched
        if (lead) {
          try {
            await admin.from('notes').insert({
              company_id: cfg.company_id, lead_id: lead.id,
              body: `WhatsApp reply: ${text}`, author_id: null,
            });
          } catch (e) {
            // Ignore errors for the timeline note so the webhook doesn't fail
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}