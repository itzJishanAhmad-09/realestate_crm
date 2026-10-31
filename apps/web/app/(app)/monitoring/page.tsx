export default function MonitoringPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Live team activity · Sample data</p>
        </div>
        <button className="rounded-md border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Listen in</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100"><p className="text-[13px] font-medium text-gray-500 mb-3">On call now</p><p className="font-serif text-4xl text-gray-900">4</p></div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100"><p className="text-[13px] font-medium text-gray-500 mb-3">Idle</p><p className="font-serif text-4xl text-gray-900">2</p></div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100"><p className="text-[13px] font-medium text-gray-500 mb-3">On break</p><p className="font-serif text-4xl text-gray-900">1</p></div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100"><p className="text-[13px] font-medium text-gray-500 mb-3">Offline</p><p className="font-serif text-4xl text-gray-900">1</p></div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Agent</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Current lead</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Call time</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Calls today</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { agent: 'Anil', status: 'On call', color: 'bg-[#E8F5E9] text-[#2E7D32]', lead: 'Amit Verma', time: '02:14', calls: 38 },
              { agent: 'Meena', status: 'On call', color: 'bg-[#E8F5E9] text-[#2E7D32]', lead: 'Neha Gupta', time: '00:48', calls: 31 },
              { agent: 'Farhan', status: 'Idle', color: 'bg-[#FFF8E1] text-[#F57F17]', lead: '—', time: '—', calls: 24 },
              { agent: 'Ritu', status: 'Break', color: 'bg-[#F5F5F5] text-[#616161]', lead: '—', time: '—', calls: 19 },
              { agent: 'Karan', status: 'Offline', color: 'bg-[#FFEBEE] text-[#C62828]', lead: '—', time: '—', calls: 0 },
            ].map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.agent}</td>
                <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${row.color}`}>{row.status}</span></td>
                <td className="px-6 py-4 text-sm text-gray-600">{row.lead}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{row.time}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.calls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}