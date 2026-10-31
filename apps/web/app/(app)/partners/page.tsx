export default function PartnersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Partners</h1>
          <p className="text-sm text-gray-500 mt-1">Channel partners and brokers · Sample data</p>
        </div>
        <button className="rounded-md bg-[#C02B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] transition-colors">Add partner</button>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Firm / Name</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">RERA ID</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Leads Sent</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Bookings</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { name: 'Prime Brokers', rera: 'UPRERA1234', leads: 45, bookings: 3, comm: '2%' },
              { name: 'Skyline Realty', rera: 'UPRERA5678', leads: 28, bookings: 1, comm: '1.5%' },
            ].map((p, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.rera}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.leads}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.bookings}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.comm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}