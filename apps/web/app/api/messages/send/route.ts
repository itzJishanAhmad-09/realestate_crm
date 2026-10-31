import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildMessagingProvider, getMessagingProvider } from '@/lib/messaging';
import { normalizePhone } from '@/lib/phone';

const Post = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(['whatsapp', 'sms']),
  body: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Post.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { data: lead } = await supabase.from('leads').select('phone').eq('id', parsed.data.leadId).single();
  const phone = normalizePhone(lead?.phone);
  if (!phone) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });

  const admin = createAdminClient();
  const { data: cfg } = await admin.from('messaging_configs').select('*')
    .eq('company_id', profile!.company_id).eq('channel', parsed.data.channel).eq('is_active', true).limit(1).maybeSingle();
  const provider = cfg ? buildMessagingProvider(cfg as any) : getMessagingProvider();

  try {
    const result = parsed.data.channel === 'whatsapp'
      ? await provider.sendWhatsApp({ to: phone, templateName: 'raw_text', languageCode: 'en', parameters: [parsed.data.body] })
      : await provider.sendSms({ to: phone, body: parsed.data.body });

    await admin.from('messages').insert({
      company_id: profile!.company_id, lead_id: parsed.data.leadId,
      channel: parsed.data.channel, direction: 'outbound', to_number: phone,
      body: parsed.data.body, provider: provider.name,
      provider_message_id: result.messageId, status: 'sent',
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
