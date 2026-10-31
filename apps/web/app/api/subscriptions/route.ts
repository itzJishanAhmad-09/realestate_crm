import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Post = z.object({
  planName: z.string().optional(),
  seats: z.number().int().positive().optional(),
});

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { data } = await supabase.from('subscriptions').select('*').eq('company_id', profile!.company_id).maybeSingle();
  if (!data) return NextResponse.json({ plan: null });
  return NextResponse.json({ subscription: data });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Post.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
  if (!profile || !['company_admin','sales_head'].includes(profile.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { error } = await supabase.from('subscriptions').upsert({
    company_id: profile.company_id,
    plan_name: parsed.data.planName ?? 'starter',
    seats: parsed.data.seats ?? 5,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, note: 'Razorpay integration stub — call order API in production' });
}
