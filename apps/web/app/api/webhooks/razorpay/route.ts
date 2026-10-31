import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/razorpay/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';

  if (!verifyWebhookSignature(raw, signature, secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const admin = createAdminClient();
  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const eventType = event.event as string;
  const entity = event.payload?.payment?.entity ?? event.payload?.subscription?.entity ?? {};
  const companyId = entity?.notes?.company_id ?? null;

  const { data: evt } = await admin.from('razorpay_events').insert({
    company_id: companyId, event_type: eventType, payload: event,
  }).select('id').single();

  try {
    if (eventType === 'payment.captured' && companyId) {
      const amount = Number(entity.amount ?? 0) / 100;
      await admin.from('subscriptions').update({
        status: 'active',
        razorpay_payment_id: entity.id,
        amount_last_paid: amount,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400_000).toISOString(),
        next_billing_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('company_id', companyId);
    } else if (eventType === 'payment.failed' && companyId) {
      await admin.from('subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('company_id', companyId);
    }
    if (evt?.id) {
      await admin.from('razorpay_events').update({ processed_at: new Date().toISOString() }).eq('id', evt.id);
    }
  } catch (err) {
    if (evt?.id) {
      await admin.from('razorpay_events').update({ error: (err as Error).message }).eq('id', evt.id);
    }
  }

  return NextResponse.json({ ok: true });
}
