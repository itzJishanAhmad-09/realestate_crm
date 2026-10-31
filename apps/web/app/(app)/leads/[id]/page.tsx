import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { LeadDetailClient } from '@/components/leads/LeadDetailClient';

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  
  const { data: profile } = await supabase.from('users').select('company_id, role, phone').eq('id', user.id).single();
  if (!profile) notFound();
  
  const cid = profile.company_id;

  const { data: lead } = await supabase.from('leads').select('*').eq('id', params.id).eq('company_id', cid).maybeSingle();
  if (!lead) notFound();

  const [
    { data: status },
    { data: source },
    { data: assignedUser },
    { data: project },
    { data: notes },
    { data: calls },
    { data: visits },
    { data: messages },
    { data: docs },
    { data: dispositions },
    { data: projects },
    { data: statuses },
  ] = await Promise.all([
    lead.status_id ? supabase.from('lead_statuses').select('label').eq('id', lead.status_id).single() : Promise.resolve({ data: null }),
    lead.source_id ? supabase.from('lead_sources').select('label').eq('id', lead.source_id).single() : Promise.resolve({ data: null }),
    lead.assigned_to ? supabase.from('users').select('full_name').eq('id', lead.assigned_to).single() : Promise.resolve({ data: null }),
    lead.project_id ? supabase.from('projects').select('name').eq('id', lead.project_id).single() : Promise.resolve({ data: null }),
    supabase.from('notes').select('id, body, created_at, users(full_name)').eq('lead_id', params.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('calls').select('id, direction, status, talk_time_sec, started_at, recording_url').eq('lead_id', params.id).order('started_at', { ascending: false }).limit(20),
    supabase.from('site_visits').select('id, scheduled_for, status, projects(name)').eq('lead_id', params.id).order('scheduled_for', { ascending: false }).limit(10),
    supabase.from('messages').select('id, channel, direction, body, created_at').eq('lead_id', params.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('documents').select('id, doc_type, file_name, verified, created_at').eq('entity_type', 'lead').eq('entity_id', params.id).order('created_at', { ascending: false }),
    supabase.from('dispositions').select('id, code, label, requires_notes').eq('company_id', cid).eq('is_active', true).order('sort_order'),
    supabase.from('projects').select('id, name').eq('company_id', cid).order('name'),
    supabase.from('lead_statuses').select('id, label, key').eq('company_id', cid).order('sort_order'),
  ]);

  const enrichedLead = {
    ...lead,
    lead_statuses: status,
    lead_sources: source,
    users: assignedUser,
    projects: project,
  };

  return (
    <LeadDetailClient
      lead={enrichedLead as any}
      notes={(notes ?? []) as any[]}
      calls={(calls ?? []) as any[]}
      visits={(visits ?? []) as any[]}
      messages={(messages ?? []) as any[]}
      docs={(docs ?? []) as any[]}
      dispositions={dispositions ?? []}
      projects={projects ?? []}
      statuses={statuses ?? []}
      userRole={profile.role}
      userPhone={profile.phone ?? ''}
    />
  );
}