
import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditEntity =
  | 'lead'
  | 'booking'
  | 'site_visit'
  | 'call'
  | 'follow_up'
  | 'automation'
  | 'campaign'
  | 'payment'
  | 'user'
  | 'project';

export async function logAudit(
  supabase: SupabaseClient,
  input: {
    companyId: string;
    actorId: string;
    entity: AuditEntity;
    entityId: string;
    action: string;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from('activity_log').insert({
    company_id: input.companyId,
    actor_id: input.actorId,
    entity: input.entity,
    entity_id: input.entityId,
    action: input.action,
    meta: input.meta ?? {},
  });
}
