import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { encryptJson } from '@/lib/telephony/crypto';

const Body = z.object({
  provider: z.enum(['exotel', 'twilio', 'knowlarity', 'myoperator']),
  callerId: z.string().min(3),
  credentials: z.record(z.string(), z.string()),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const { data: profile } = await supabase.from('users')
    .select('company_id, role').eq('id', user.id).single();
  if (!profile || !['company_admin', 'sales_head'].includes(profile.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { data, error } = await supabase.from('telephony_configs').upsert({
    company_id: profile.company_id, provider: parsed.data.provider,
    label: 'default', caller_id: parsed.data.callerId,
    credentials_enc: encryptJson(parsed.data.credentials),
  }, { onConflict: 'company_id,provider,label' }).select('id, provider, webhook_token').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    ok: true, id: data.id,
    webhookUrl: `${process.env.APP_URL}/api/webhooks/telephony/${data.provider}/${data.webhook_token}`,
  });
}
