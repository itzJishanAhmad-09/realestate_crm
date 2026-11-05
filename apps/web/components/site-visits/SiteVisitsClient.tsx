'use client';
import Link from 'next/link';

function formatVisitDate(dateString: string) {
  if (!dateString) return 'ρ';
  const d = new Date(dateString);
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const time = d.toLocaleTimeString('in-EN', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (d >= today && d < tomorrow) {
    return 'Today ' + time;
  } else if (d >= tomorrow && d < new Date(tomorrow.getTime() + 86400000)) {
    return 'Tomorrow ' + time;
  } else if (d >= yesterday && d < today) {
    return 'Yesterday ' + time;
  } else {
    return d.toLocaleDateString('in-EN', { weekday: 'short' }) + ' ' + time;
  }
}

const STATUS_COLORS: Record<string, string> = {
  'confirmed': 'bg-[#E8F5E9] text-[#2E7D32]',
  'pending': 'bg-[#FFF8E1] text-[#F57F17]',
  'scheduled': 'bg-[#FFEBEE] text-[#C62828]',
  'completed': 'bg-[#E8F5E9] text-[#2E7D32]',
  'no_show': 'bg-[#FFF8E1] text-[#F57F17]',
};

function formatStatus(status: string) {
  if (!status) return 'Scheduled';
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function SiteVisitsClient({ visits, stats }: { visits: any[], stats: any }) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Site visits</h1>
          <p className="text-sm text-gray-500 mt-1">Live schedule</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-[13px] font-medium text-gray-500 mb-3">Today</p>
          <p className="font-serif text-4xl text-gray-900">{stats.today}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-[13px] font-medium text-gray-500 mb-3">This week</p>
          <p className="font-serif text-4xl text-gray-900">{stats.thisWeek}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-[13px] font-medium text-gray-500 mb-3">Completed this month</p>
          <p className="font-serif text-4xl text-gray-900">{stats.completedThisMonth}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-[13px] font-medium text-gray-500 mb-3">No-shows</p>
          <p className="font-serif text-4xl text-gray-900">{stats.noShows}</p>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Lead</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Project</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">When</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Agent</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visits.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <Link href={'/leads/' + v.lead_id} className="hover:underline">
                      {v.leads?.name || 'Unknown Lead'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{v.projects?.name || 'ρ' }</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{formatVisitDate(v.scheduled_for)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{v.users?.full_name || 'Unassigned'}</td>
                  <td className="px-6 py-4">
                    <span className={'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ' + (STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-700')}>
                      {formatStatus(v.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {v.status === 'completed' || v.status === 'done' ? (
                      <Link
                        href={'/bookings/new?leadId=' + v.lead_id + '&projectId=' + v.project_id}
                        className="rounded-md bg-[#C02B2B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A42A22]"
                      >
                        Convert to Booking
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {visits.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                    No site visits scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}