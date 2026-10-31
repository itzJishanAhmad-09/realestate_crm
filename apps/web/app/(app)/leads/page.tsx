import { createServerClient } from '@/lib/supabase/server';
import { LeadsClient } from '@/components/leads/LeadsClient';
import { redirect } from 'next/navigation';

export default async function LeadsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) redirect('/login');
  
  const cid = profile.company_id;

  const [{ data: rawLeads }, { data: statuses }, { data: projects }, { data: agents }, { data: sources }] = await Promise.all([
    supabase.from('leads').select('*').eq('company_id', cid).order('created_at', { ascending: false }).limit(100),
    supabase.from('lead_statuses').select('id, label').eq('company_id', cid),
    supabase.from('projects').select('id, name').eq('company_id', cid),
    supabase.from('users').select('id, full_name').eq('company_id', cid),
    supabase.from('lead_sources').select('id, label').eq('company_id', cid),
  ]);

  const leads = (rawLeads ?? []).map((l: any) => ({
    ...l,
    lead_statuses: statuses?.find((s: any) => s.id === l.status_id) || null,
    users: agents?.find((a: any) => a.id === l.assigned_to) || null,
    projects: projects?.find((p: any) => p.id === l.project_id) || null,
    lead_sources: sources?.find((s: any) => s.id === l.source_id) || null,
  }));

  return <LeadsClient leads={leads} />;
}