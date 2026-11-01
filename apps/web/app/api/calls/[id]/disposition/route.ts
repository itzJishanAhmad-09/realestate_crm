import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler, requireApiUser, ApiError } from '@/lib/api/require-user';
import { logAudit } from '@/lib/audit/log';

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

export const POST = apiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const { supabase, companyId, userId } = await requireApiUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new ApiError('invalid_body', 400);

  const { data: call } = await supabase
    .from('calls')
    .select('id, agent_id, lead_id')
    .eq('id', params.id)
    .eq('company_id', companyId)
    .maybeSingle();
  if (!call) throw new ApiError('call_not_found', 404);
  if (call.agent_id !== userId) throw new ApiError('forbidden', 403);

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
    throw new ApiError(code, code === 'forbidden' ? 403 : 400);
  }

  await logAudit(supabase, {
    companyId, actorId: userId, entity: 'call', entityId: params.id,
    action: 'disposition_saved', meta: { dispositionId: b.dispositionId, hasVisit: !!b.siteVisit },
  });

  return NextResponse.json({ ok: true, result: data });
});