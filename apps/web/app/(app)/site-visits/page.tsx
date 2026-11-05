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

  const enrichedVisits = (visits ?? []).map((v: any) => ({
    ...v,
    leads: leads?.find((l: any) => l.id === v.lead_id) || null,
    projects: projects?.find((p: any) => p.id === v.project_id) || null,
    users: users?.find((u: any) => u.id === v.assigned_to) || null,
  }));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 86400000;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const stats = {
    today: enrichedVisits.filter(v => {
      const t = new Date(v.scheduled_for).getTime();
      return t >= todayStart && t < tomorrowStart;
    }).length,
    thisWeek: enrichedVisits.filter(v => new Date(v.scheduled_for).getTime() >= weekStart).length,
    completedThisMonth: enrichedVisits.filter(v => v.status === 'completed' && new Date(v.scheduled_for).getTime() >= monthStart).length,
    noShows: enrichedVisits.filter(v => v.status === 'no_show').length,
  };

  return <SiteVisitsClient visits={enrichedVisits} stats={stats} />;
}