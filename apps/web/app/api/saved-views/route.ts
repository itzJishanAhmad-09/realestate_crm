import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Post = z.object({
  entity: z.enum(['leads','bookings','site_visits','calls']),
  name: z.string().min(1).max(80),
  filter: z.record(z.string(), z.any()).default({}),
  isDefault: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const entity = req.nextUrl.searchParams.get('entity');
  let q = supabase.from('saved_views').select('*').order('created_at', { ascending: false });
  if (entity) q = q.eq('entity', entity);
  const { data } = await q;
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Post.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { data, error } = await supabase.from('saved_views').insert({
    company_id: profile!.company_id, user_id: user.id,
    entity: parsed.data.entity, name: parsed.data.name,
    filter: parsed.data.filter, is_default: parsed.data.isDefault,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
