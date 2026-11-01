import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function formatSpeed(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export default async function DashboardPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, full_name')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/login');

  const cid = profile.company_id;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();
  const tomorrowIso = new Date(startOfToday.getTime() + 86_400_000).toISOString();

  const [
    { count: leadsToday },
    { count: callsToday },
    { count: connectedToday },
    { count: followUpsDue },
    { count: siteVisitsToday },
    { data: recentLeads },
    { data: pipelineStages },
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true })
      .eq('company_id', cid).gte('created_at', todayIso),
    supabase.from('calls').select('id', { count: 'exact', head: true })
      .eq('company_id', cid).gte('started_at', todayIso),
    supabase.from('calls').select('id', { count: 'exact', head: true })
      .eq('company_id', cid).eq('status', 'completed')
      .gte('started_at', todayIso).gte('talk_time_sec', 30),
    supabase.from('follow_ups').select('id', { count: 'exact', head: true })
      .eq('company_id', cid).is('done_at', null).lte('due_at', todayIso),
    supabase.from('site_visits').select('id', { count: 'exact', head: true })
      .eq('company_id', cid)
      .gte('scheduled_for', todayIso).lt('scheduled_for', tomorrowIso),
    supabase.from('leads')
      .select('id, name, budget_max, lead_statuses(label, key), lead_sources(label)')
      .eq('company_id', cid).order('created_at', { ascending: false }).limit(5),
    supabase.from('lead_statuses')
      .select('id, label, sort_order')
      .eq('company_id', cid).order('sort_order'),
  ]);

  // Real pipeline counts — one lightweight count per status, in parallel
  const pipelineData = await Promise.all(
    (pipelineStages ?? []).map(async (stage: any) => {
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', cid)
        .eq('status_id', stage.id);
      return { label: stage.label, count: count ?? 0 };
    }),
  );

  // Speed-to-lead median (RPC may not be deployed yet — fail soft)
  let speedToLeadSeconds: number | null = null;
  try {
    const { data } = await supabase.rpc('speed_to_lead_median', { p_company_id: cid });
    speedToLeadSeconds = (data as number | null) ?? null;
  } catch {
    /* migration not applied yet */
  }

  const connectRate = callsToday
    ? Math.round(((connectedToday ?? 0) / callsToday) * 100)
    : 0;
  const maxPipeline = Math.max(...pipelineData.map((p) => p.count), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Today</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {profile.full_name?.split(' ')[0] || 'Agent'}
          </p>
        </div>
        <Link
          href="/calling"
          className="rounded-md bg-[#C02B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] transition-colors"
        >
          Start calling
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Leads today" value={leadsToday ?? 0} />
        <StatCard
          label="Calls today"
          value={callsToday ?? 0}
          sub={callsToday ? `${connectRate}% connected` : undefined}
        />
        <StatCard
          label="Speed to lead"
          value={formatSpeed(speedToLeadSeconds)}
          sub="median, last 30 days"
        />
        <StatCard label="Follow-ups due" value={followUpsDue ?? 0} />
        <StatCard label="Site visits today" value={siteVisitsToday ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="font-serif text-2xl text-gray-900 mb-6">Recent Leads</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-[11px] font-semibold uppercase text-gray-500">Lead</th>
                <th className="pb-3 text-[11px] font-semibold uppercase text-gray-500">Budget</th>
                <th className="pb-3 text-[11px] font-semibold uppercase text-gray-500">Stage</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(recentLeads ?? []).map((row: any) => {
                const status = Array.isArray(row.lead_statuses)
                  ? row.lead_statuses[0]
                  : row.lead_statuses;
                return (
                  <tr key={row.id}>
                    <td className="py-4 text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="py-4 text-sm text-gray-600">
                      {row.budget_max
                        ? `₹${(row.budget_max / 100000).toFixed(1)} L`
                        : '—'}
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[11px] font-medium text-[#2E7D32]">
                        {status?.label ?? 'New'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <Link
                        href={`/leads/${row.id}`}
                        className="rounded-md bg-[#C02B2B] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#A42A22]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(recentLeads ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                    No leads yet. Add some to see them here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="font-serif text-2xl text-gray-900 mb-6">Pipeline</h2>
          <div className="space-y-4">
            {pipelineData.map((stage) => (
              <div key={stage.label} className="flex items-center text-sm">
                <span className="w-24 text-gray-600">{stage.label}</span>
                <div className="flex-1 ml-4 h-2.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-[#C02B2B] rounded-full"
                    style={{ width: `${Math.min((stage.count / maxPipeline) * 100, 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium text-gray-900">
                  {stage.count}
                </span>
              </div>
            ))}
            {pipelineData.length === 0 && (
              <p className="text-sm text-gray-500">No pipeline stages set up.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      <p className="text-[13px] font-medium text-gray-500 mb-3">{label}</p>
      <p className="font-serif text-4xl text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}
