import { NextResponse } from 'next/server';
import { apiHandler, requireApiUser } from '@/lib/api/require-user';

export const GET = apiHandler(async () => {
  const { supabase, companyId } = await requireApiUser();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();
  const tomorrowIso = new Date(startOfToday.getTime() + 86_400_000).toISOString();

  const [leadsToday, callsToday, connectedToday, followUpsDue, visitsToday] = await Promise.all([
    supabase.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', todayIso),
    supabase.from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('started_at', todayIso),
    supabase.from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .gte('started_at', todayIso)
      .gte('talk_time_sec', 30),
    supabase.from('follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('done_at', null)
      .lte('due_at', todayIso),
    supabase.from('site_visits')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('scheduled_for', todayIso)
      .lt('scheduled_for', tomorrowIso),
  ]);

  const { data: stl } = await supabase.rpc('speed_to_lead_median', { p_company_id: companyId });

  return NextResponse.json({
    leadsToday: leadsToday.count ?? 0,
    callsToday: callsToday.count ?? 0,
    connectedToday: connectedToday.count ?? 0,
    connectRate: callsToday.count
      ? Math.round(((connectedToday.count ?? 0) / callsToday.count) * 100)
      : 0,
    followUpsDue: followUpsDue.count ?? 0,
    siteVisitsToday: visitsToday.count ?? 0,
    speedToLeadSeconds: stl ?? null,
  });
});
