import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Patch = z.object({
  status: z.enum(['scheduled', 'confirmed', 'rescheduled', 'no_show', 'done', 'canceled']).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const { error } = await supabase.from('site_visits')
    .update({ ...parsed.data, updated_at: new Date().toISOString() }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (parsed.data.status === 'canceled' || parsed.data.status === 'no_show') {
    await supabase.from('reminders').update({ status: 'canceled' })
      .eq('entity_type', 'site_visit').eq('entity_id', params.id).eq('status', 'pending');
  }
  return NextResponse.json({ ok: true });
}
