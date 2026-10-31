import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const PostBody = z.object({
  name: z.string().min(1),
  builder: z.string().optional(),
  locality: z.string().optional(),
  city: z.string().optional(),
  reraNumber: z.string().optional(),
  status: z.enum(['pre_launch', 'launched', 'under_construction', 'ready']).default('launched')
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });

  const { data, error } = await supabase.from('projects').insert({
    company_id: profile.company_id,
    name: parsed.data.name,
    builder: parsed.data.builder || null,
    locality: parsed.data.locality || null,
    city: parsed.data.city || null,
    rera_number: parsed.data.reraNumber || null,
    status: parsed.data.status,
    is_active: true
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
