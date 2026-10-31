import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/razorpay/client';

const Body = z.object({
  seats: z.number().int().positive().max(500),
  planName: z.enum(['starter','growth','scale']).default('growth'),
});

const PLAN_PAISE: Record<string, number> = { starter: 29900, growth: 49900, scale: 99900 };

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
  if (!profile || !['company_admin','sales_head'].includes(profile.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const amountPaise = PLAN_PAISE[parsed.data.planName] * parsed.data.seats;

  try {
    const order = await createOrder({
      amountPaise,
      receipt: `seats-${parsed.data.seats}-${Date.now()}`,
      notes: { company_id: profile.company_id, seats: String(parsed.data.seats), plan: parsed.data.planName },
    });

    await supabase.from('subscriptions').upsert({
      company_id: profile.company_id,
      plan_name: parsed.data.planName,
      seats: parsed.data.seats,
      amount_per_seat: PLAN_PAISE[parsed.data.planName] / 100,
      razorpay_order_id: order.id,
      status: 'trial',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amountPaise,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      planName: parsed.data.planName,
      seats: parsed.data.seats,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
