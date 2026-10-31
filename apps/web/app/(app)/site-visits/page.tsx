import { createServerClient } from '@/lib/supabase/server';
import { SiteVisitBoard } from '@/components/site-visits/SiteVisitBoard';

export default async function SiteVisitsPage() {
  const supabase = createServerClient();
  const { data: visits } = await supabase
    .from('site_visits')
    .select(`
      id, scheduled_for, status, pickup_required, visitors_count, location_url,
      leads(id, name, phone),
      projects(id, name),
      users!site_visits_assigned_to_fkey(id, name)
    `)
    .gte('scheduled_for', new Date(Date.now() - 7 * 86_400_000).toISOString())
    .order('scheduled_for');
  return <SiteVisitBoard visits={(visits ?? []) as any[]} />;
}
