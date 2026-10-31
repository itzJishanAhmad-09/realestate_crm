import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function BookingsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_number, total_value, status, leads(name), projects(name), units(unit_number)')
    .eq('company_id', profile?.company_id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Your confirmed sales</p>
        </div>
        <button className="rounded-md bg-[#C02B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] transition-colors">New booking</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100"><p className="text-[13px] font-medium text-gray-500 mb-3">Total Bookings</p><p className="font-serif text-4xl text-gray-900">{bookings?.length || 0}</p></div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100"><p className="text-[13px] font-medium text-gray-500 mb-3">Total Value</p><p className="font-serif text-4xl text-gray-900">₹{bookings?.reduce((s, b:any) => s + (b.total_value || 0), 0).toLocaleString('en-IN') || 0}</p></div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100"><p className="text-[13px] font-medium text-gray-500 mb-3">Pending</p><p className="font-serif text-4xl text-gray-900">{bookings?.filter((b:any) => b.status === 'pending').length || 0}</p></div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100"><p className="text-[13px] font-medium text-gray-500 mb-3">Completed</p><p className="font-serif text-4xl text-gray-900">{bookings?.filter((b:any) => b.status === 'completed').length || 0}</p></div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Lead</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Project</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Unit</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Value</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(bookings ?? []).map((b: any) => (
              <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{b.leads?.name || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{b.projects?.name || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{b.units?.unit_number || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">₹{b.total_value?.toLocaleString('en-IN') || 0}</td>
                <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${b.status === 'completed' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF8E1] text-[#F57F17]'}`}>{b.status}</span></td>
              </tr>
            ))}
            {(bookings ?? []).length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-500">No bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}