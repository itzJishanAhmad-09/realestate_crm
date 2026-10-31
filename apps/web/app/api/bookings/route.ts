import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createBooking } from '@/lib/bookings';

const Body = z.object({
  leadId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  basePrice: z.number().nonnegative(),
  totalValue: z.number().positive(),
  tokenAmount: z.number().nonnegative(),
  applicant: z.record(z.string(), z.any()),
  paymentPlan: z.array(z.object({
    milestone: z.string(),
    percent: z.number(),
    dueDate: z.string().optional(),
  })).default([]),
  channelPartnerId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase.from('bookings')
    .select('id, booking_number, status, booking_date, total_value, leads(name), projects(name), units(unit_number)')
    .order('created_at', { ascending: false }).limit(200);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  try {
    const booking = await createBooking(supabase, profile!.company_id, user.id, {
      lead_id: parsed.data.leadId,
      project_id: parsed.data.projectId,
      unit_id: parsed.data.unitId,
      base_price: parsed.data.basePrice,
      total_value: parsed.data.totalValue,
      token_amount: parsed.data.tokenAmount,
      applicant: parsed.data.applicant,
      payment_plan: parsed.data.paymentPlan.map((m) => ({ milestone: m.milestone, percent: m.percent, due_date: m.dueDate })),
      channel_partner_id: parsed.data.channelPartnerId,
      notes: parsed.data.notes,
    });
    return NextResponse.json({ ok: true, ...booking });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
