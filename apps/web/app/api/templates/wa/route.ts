import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Body = z.object({
  name: z.string().min(1).max(120),
  displayName: z.string().min(1),
  languageCode: z.string().default('en'),
  category: z.enum(['marketing','utility','authentication']).default('marketing'),
  body: z.string().min(1),
  variables: z.array(z.string()).default([]),
  status: z.enum(['draft','pending_approval','approved','rejected','paused']).default('draft'),
});

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase.from('wa_templates').select('*').order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { data, error } = await supabase.from('wa_templates').insert({
    company_id: profile!.company_id,
    name: parsed.data.name,
    display_name: parsed.data.displayName,
    language_code: parsed.data.languageCode,
    category: parsed.data.category,
    body: parsed.data.body,
    variables: parsed.data.variables,
    status: parsed.data.status,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
