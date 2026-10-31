import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SiteVisitsClient } from '@/components/site-visits/SiteVisitsClient';

export default async function SiteVisitsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const cid = profile.company_id;

  // Fetch all necessary data in parallel
  const [
    { data: visits },
    { data: leads },
    { data: projects },
    { data: users }
  ] = await Promise.all([
    supabase.from('site_visits').select('*').eq('company_id', cid).order('scheduled_for', { ascending: true }).limit(100),
    supabase.from('leads').select('id, name').eq('company_id', cid),
    supabase.from('projects').select('id, name').eq('company_id', cid),
    supabase.from('users').select('id, full_name').eq('company_id', cid)
  ]);

  // Stitch data together securely
  const enrichedVisits = (visits ?? []).map((v: any) => ({
    ...v,
    leads: leads?.find((l: any) => l.id === v.lead_id) || null,
    projects: projects?.find((p: any) => p.id === v.project_id) || null,
    users: users?.find((u: any) => u.id === v.assigned_to) || null,
  }));

  // Calculate Stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const stats = {
    today: enrichedVisits.filter(v => v.scheduled_for >= todayStart && v.scheduled_for < tomorrowStart).length,
    thisWeek: enrichedVisits.filter(v => v.scheduled_for >= weekStart).length,
    completedThisMonth: enrichedVisits.filter(v => v.status === 'completed' && v.scheduled_for >= monthStart).length,
    noShows: enrichedVisits.filter(v => v.status === 'no_show').length,
  };

  return <SiteVisitsClient visits={enrichedVisits} stats={stats} />;
}