import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Post = z.object({
  date: z.string().optional(),
  platform: z.enum(['facebook','google','99acres','magicbricks','housing','nobroker','other']),
  sourceId: z.string().uuid().optional(),
  campaign: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.string().default('INR'),
  notes: z.string().optional(),
});

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase.from('ad_spend').select('*').order('date', { ascending: false }).limit(200);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Post.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { error } = await supabase.from('ad_spend').insert({
    company_id: profile!.company_id,
    date: parsed.data.date ?? new Date().toISOString().slice(0, 10),
    platform: parsed.data.platform,
    source_id: parsed.data.sourceId ?? null,
    campaign: parsed.data.campaign ?? null,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    notes: parsed.data.notes ?? null,
    created_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
