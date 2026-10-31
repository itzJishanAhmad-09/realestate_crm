import { createAdminClient as __createAdmin } from './supabase/admin';
import { normalizePhone as __normalizePhone } from './phone';

// 1. Interface for Webhooks
export interface IncomingLead {
  companyId: string;
  name: string;
  phone: string;
  email?: string | null;
  sourceKey?: string;
  externalId?: string;
  rawPayload?: any;
  dedupe?: 'skip' | 'update' | 'merge';
}

export interface UpsertLeadResult {
  id: string;
  duplicate: boolean;
  leadId: string;
  action: 'inserted' | 'updated' | 'skipped';
}

// 2. Function used by Phase 1 Actions (Auto-assignment)
export async function pickAssignee(companyId: string, projectId: string | null = null): Promise<string | null> {
  const admin = __createAdmin();
  
  // Get all active agents
  const { data: users } = await admin.from('users').select('id')
    .eq('company_id', companyId)
    .in('role', ['telecaller', 'sales_exec'])
    .eq('is_active', true);

  if (!users || users.length === 0) return null;
  if (users.length === 1) return users[0].id;

  // Get current lead counts for load balancing
  const { data: leads } = await admin.from('leads').select('assigned_to')
    .eq('company_id', companyId)
    .in('assigned_to', users.map((u: any) => u.id));

  const counts: Record<string, number> = {};
  users.forEach((u: any) => counts[u.id] = 0);
  leads?.forEach((l: any) => { 
    if (l.assigned_to) counts[l.assigned_to] = (counts[l.assigned_to] || 0) + 1; 
  });

  // Sort by fewest leads and return the winner
  const sorted = users.sort((a: any, b: any) => counts[a.id] - counts[b.id]);
  return sorted[0].id;
}

// 3. Function used by Webhooks (Lead ingestion)
export async function upsertLeadFromIncoming(
  incoming: IncomingLead,
): Promise<UpsertLeadResult> {
  const admin = __createAdmin();
  const phone = __normalizePhone(incoming.phone ?? '');
  if (!phone) throw new Error('invalid_phone');

  const { data: existing } = await admin.from('leads').select('id')
    .eq('company_id', incoming.companyId).eq('phone', phone).limit(1).maybeSingle();

  if (existing) {
    if (incoming.dedupe === 'skip') {
      return { id: existing.id, duplicate: true, leadId: existing.id, action: 'skipped' };
    }
    await admin.from('leads').update({
      name: incoming.name ?? undefined,
      email: incoming.email ?? undefined,
    }).eq('id', existing.id);
    return { id: existing.id, duplicate: true, leadId: existing.id, action: 'updated' };
  }

  // Find default status
  const { data: status } = await admin.from('lead_statuses').select('id')
    .eq('company_id', incoming.companyId).eq('key', 'new').limit(1).maybeSingle();

  // Find agent using the pickAssignee function
  const agentId = await pickAssignee(incoming.companyId);

  // Find source by key
  let sourceId = null;
  if (incoming.sourceKey) {
    const { data: source } = await admin.from('lead_sources').select('id')
      .eq('company_id', incoming.companyId).eq('key', incoming.sourceKey).limit(1).maybeSingle();
    if (source) sourceId = source.id;
  }

  const { data: created, error } = await admin.from('leads').insert({
    company_id: incoming.companyId,
    name: incoming.name,
    phone,
    email: incoming.email,
    status_id: status?.id,
    source_id: sourceId,
    assigned_to: agentId,
    external_id: incoming.externalId,
    raw_payload: incoming.rawPayload,
  }).select('id').single();

  if (error || !created) throw error ?? new Error('insert_failed');
  return { id: created.id, duplicate: false, leadId: created.id, action: 'inserted' };
}