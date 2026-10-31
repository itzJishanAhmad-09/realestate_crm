import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function FollowUpsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  
  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('id, due_at, note, channel, leads(name, lead_statuses(label)), users(full_name)')
    .eq('company_id', profile?.company_id)
    .is('done_at', null)
    .order('due_at', { ascending: true })
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Follow-ups</h1>
          <p className="text-sm text-gray-500 mt-1">Upcoming tasks</p>
        </div>
        <button className="rounded-md bg-[#C02B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] transition-colors">Add follow-up</button>
      </div>

      <div className="flex gap-2">
        <button className="rounded-md bg-[#C02B2B] px-4 py-2 text-sm font-semibold text-white shadow-sm">Today {followUps?.length || 0}</button>
        <button className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Overdue 0</button>
        <button className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Upcoming 0</button>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Lead</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Task</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Due</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Agent</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Stage</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(followUps ?? []).map((row: any) => (
              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  <Link href={`/leads/${row.leads?.id}`}>{row.leads?.name || 'Unknown'}</Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{row.note || row.channel || 'Call back'}</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{new Date(row.due_at).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{row.users?.full_name || 'Me'}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[11px] font-medium text-[#2E7D32]">{row.leads?.lead_statuses?.label || 'Interested'}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="rounded-md border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">Mark done</button>
                </td>
              </tr>
            ))}
            {(followUps ?? []).length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-500">No follow-ups scheduled.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}