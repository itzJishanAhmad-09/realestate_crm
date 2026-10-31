'use client';
import Link from 'next/link';

function maskPhone(phone: string) {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 5) return phone;
  return `${clean.slice(0, 2)}••••${clean.slice(-3)}`;
}
function formatBudget(min: number | null, max: number | null) {
  if (max) {
    if (max >= 10000000) return `₹${(max / 10000000).toFixed(1)} Cr`;
    if (max >= 100000) return `₹${(max / 100000).toFixed(0)} L`;
    return `₹${max}`;
  }
  return '—';
}
const STAGE_COLORS: Record<string, string> = {
  'Interested': 'bg-[#E8F5E9] text-[#2E7D32]', 'Site visit': 'bg-[#FFF8E1] text-[#F57F17]',
  'New': 'bg-[#FFEBEE] text-[#C62828]', 'Cold': 'bg-[#F5F5F5] text-[#616161]',
  'Booked': 'bg-[#E8F5E9] text-[#2E7D32]', 'Contacted': 'bg-[#E3F2FD] text-[#1565C0]',
};

export function LeadsClient({ leads }: { leads: any[] }) {
  const displayData = leads.map(l => ({
    id: l.id, name: l.name, phone: l.phone,
    property_type: l.property_type ? `${l.locality ? l.locality + ' · ' : ''}${l.property_type}` : '—',
    budget_max: l.budget_max, stage: l.lead_statuses?.label || 'New',
    source: l.lead_sources?.label || 'Direct', agent: l.users?.full_name || 'Unassigned',
    next_followup_at: l.next_followup_at ? new Date(l.next_followup_at).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}) : '—'
  }));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{leads.length === 0 ? 'No leads found' : 'All leads'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/leads/import" className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Import CSV</Link>
          <Link href="/leads/new" className="rounded-md bg-[#C02B2B] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22]">Add lead</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
        <div className="space-y-1.5"><label className="text-[13px] font-medium text-gray-900">Search</label><input type="text" placeholder="Name or phone" className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#A42A22] focus:outline-none" /></div>
        <div className="space-y-1.5"><label className="text-[13px] font-medium text-gray-900">Project</label><select className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"><option>All projects</option></select></div>
        <div className="space-y-1.5"><label className="text-[13px] font-medium text-gray-900">Stage</label><select className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"><option>All stages</option></select></div>
        <div className="space-y-1.5"><label className="text-[13px] font-medium text-gray-900">Source</label><select className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"><option>All sources</option></select></div>
        <div className="space-y-1.5"><label className="text-[13px] font-medium text-gray-900">Agent</label><select className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"><option>All agents</option></select></div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Phone</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Interest</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Budget</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Stage</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Source</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Agent</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Next follow-up</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono text-[13px]">{maskPhone(row.phone)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.property_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatBudget(null, row.budget_max)}</td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STAGE_COLORS[row.stage] || 'bg-gray-100 text-gray-700'}`}>{row.stage}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.source}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.agent}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.next_followup_at}</td>
                  <td className="px-6 py-4 text-right"><Link href={`/leads/${row.id}`} className="rounded-md bg-[#C02B2B] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#A42A22]">View</Link></td>
                </tr>
              ))}
              {displayData.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-500">No leads yet. Click "Add lead" to create your first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}