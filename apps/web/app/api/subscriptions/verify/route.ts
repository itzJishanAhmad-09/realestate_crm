import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { verifyPaymentSignature } from '@/lib/razorpay/client';

const Body = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const ok = verifyPaymentSignature(
    parsed.data.razorpay_order_id, parsed.data.razorpay_payment_id, parsed.data.razorpay_signature,
  );
  if (!ok) return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  await supabase.from('subscriptions').update({
    status: 'active',
    razorpay_payment_id: parsed.data.razorpay_payment_id,
    razorpay_signature: parsed.data.razorpay_signature,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 86400_000).toISOString(),
    next_billing_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('company_id', profile!.company_id);

  return NextResponse.json({ ok: true });
}
