import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Body = z.object({
  dispositionId: z.string().uuid(),
  notes: z.string().max(4000).optional(),
  nextFollowupAt: z.string().datetime().optional(),
  siteVisit: z.object({
    projectId: z.string().uuid(),
    scheduledFor: z.string().datetime(),
    assignedTo: z.string().uuid().optional(),
    pickupRequired: z.boolean().optional(),
    visitorsCount: z.number().int().min(1).max(20).optional(),
    durationMinutes: z.number().int().min(15).max(480).optional(),
  }).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  const b = parsed.data;

  const { data, error } = await supabase.rpc('apply_call_disposition', {
    p_call_id: params.id,
    p_disposition_id: b.dispositionId,
    p_notes: b.notes ?? null,
    p_next_followup_at: b.nextFollowupAt ?? null,
    p_site_visit: b.siteVisit ? {
      project_id: b.siteVisit.projectId,
      scheduled_for: b.siteVisit.scheduledFor,
      assigned_to: b.siteVisit.assignedTo ?? null,
      pickup_required: b.siteVisit.pickupRequired ?? false,
      visitors_count: b.siteVisit.visitorsCount ?? 1,
      duration_minutes: b.siteVisit.durationMinutes ?? 60,
    } : null,
  });
  if (error) {
    const known = ['call_not_found', 'disposition_not_found', 'notes_required', 'forbidden'];
    const code = known.find((k) => error.message.includes(k)) ?? 'disposition_failed';
    return NextResponse.json({ error: code }, { status: code === 'forbidden' ? 403 : 400 });
  }
  return NextResponse.json({ ok: true, result: data });
}
