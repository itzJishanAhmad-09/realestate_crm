import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Post = z.object({
  leadId: z.string().uuid(),
  projectId: z.string().uuid(),
  scheduledFor: z.string().datetime(),
  assignedTo: z.string().uuid().optional(),
  pickupRequired: z.boolean().default(false),
  visitorsCount: z.number().int().min(1).max(20).default(1),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Post.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { data: visit, error } = await supabase.from('site_visits').insert({
    company_id: profile!.company_id, lead_id: parsed.data.leadId,
    project_id: parsed.data.projectId, assigned_to: parsed.data.assignedTo ?? user.id,
    scheduled_for: parsed.data.scheduledFor,
    pickup_required: parsed.data.pickupRequired,
    visitors_count: parsed.data.visitorsCount,
    notes: parsed.data.notes ?? null, created_by: user.id,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const when = new Date(parsed.data.scheduledFor);
  const reminders = [
    { company_id: profile!.company_id, entity_type: 'site_visit', entity_id: visit.id,
      channel: 'whatsapp', send_at: new Date().toISOString(), payload: { kind: 'confirmation' } },
    { company_id: profile!.company_id, entity_type: 'site_visit', entity_id: visit.id,
      channel: 'whatsapp', send_at: new Date(when.getTime() - 86_400_000).toISOString(), payload: { kind: 'reminder_1d' } },
    { company_id: profile!.company_id, entity_type: 'site_visit', entity_id: visit.id,
      channel: 'whatsapp', send_at: new Date(when.getTime() - 7_200_000).toISOString(), payload: { kind: 'reminder_2h' } },
  ];
  await supabase.from('reminders').insert(reminders);

  return NextResponse.json({ ok: true, id: visit.id });
}
