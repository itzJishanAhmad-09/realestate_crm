import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Body = z.object({
  name: z.string().min(1).max(120),
  displayName: z.string().min(1),
  body: z.string().min(1),
  variables: z.array(z.string()).default([]),
  dltTemplateId: z.string().optional(),
  dltEntityId: z.string().optional(),
  senderId: z.string().optional(),
});

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase.from('sms_templates').select('*').order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { data, error } = await supabase.from('sms_templates').insert({
    company_id: profile!.company_id,
    name: parsed.data.name, display_name: parsed.data.displayName,
    body: parsed.data.body, variables: parsed.data.variables,
    dlt_template_id: parsed.data.dltTemplateId ?? null,
    dlt_entity_id: parsed.data.dltEntityId ?? null,
    sender_id: parsed.data.senderId ?? null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
