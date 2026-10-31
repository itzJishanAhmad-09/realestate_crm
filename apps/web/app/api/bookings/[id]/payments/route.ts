import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Post = z.object({
  amountPaid: z.number().positive(),
  paidDate: z.string().optional(),
  paymentMode: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data } = await supabase.from('payments').select('*').eq('booking_id', params.id).order('milestone_no');
  return NextResponse.json(data ?? []);
}

/** Record a payment against the earliest pending/partial milestone. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Post.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const { data: open, error: findErr } = await supabase.from('payments')
    .select('id, amount_due, amount_paid, milestone_no')
    .eq('booking_id', params.id)
    .in('status', ['pending', 'partial', 'overdue'])
    .order('milestone_no').limit(1).maybeSingle();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 400 });
  if (!open) return NextResponse.json({ error: 'no_open_milestone' }, { status: 409 });

  const newPaid = Number(open.amount_paid) + parsed.data.amountPaid;
  const status = newPaid >= Number(open.amount_due) ? 'paid' : 'partial';
  const { error } = await supabase.from('payments').update({
    amount_paid: newPaid,
    status,
    paid_date: parsed.data.paidDate ?? new Date().toISOString().slice(0, 10),
    payment_mode: parsed.data.paymentMode ?? null,
    reference: parsed.data.reference ?? null,
    notes: parsed.data.notes ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', open.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, milestoneId: open.id, status });
}
