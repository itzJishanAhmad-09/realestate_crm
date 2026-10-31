import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Body = z.object({
  leadId: z.string().uuid(),
  unitId: z.string().uuid(),
  paymentPlan: z.array(z.object({
    milestone: z.string(),
    percent: z.number(),
    due: z.string().optional(),
  })).default([]),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const { data, error } = await supabase.rpc('generate_cost_sheet', {
    p_lead_id: parsed.data.leadId,
    p_unit_id: parsed.data.unitId,
    p_payment_plan: parsed.data.paymentPlan,
  });
  if (error) {
    const code = error.message.includes('unit_not_found') ? 'unit_not_found' : 'cost_sheet_failed';
    return NextResponse.json({ error: code, detail: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data });
}
