export default function AuditLogPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Audit log</h1>
          <p className="text-sm text-gray-500 mt-1">Sample data</p>
        </div>
        <button className="rounded-md border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Export</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
        <div className="space-y-1.5"><label className="text-[13px] font-medium text-gray-900">User</label><select className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"><option>All users</option></select></div>
        <div className="space-y-1.5"><label className="text-[13px] font-medium text-gray-900">Action</label><select className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"><option>All actions</option></select></div>
        <div className="space-y-1.5"><label className="text-[13px] font-medium text-gray-900">Date</label><input type="date" className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700" /></div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Time</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">User</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Action</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { time: '10:42', user: 'Meena', action: 'Changed stage', target: 'Amit Verma → Interested' },
              { time: '10:15', user: 'Anil', action: 'Exported leads', target: '214 rows' },
              { time: '09:50', user: 'Admin', action: 'Invited user', target: 'Ritu' },
              { time: '09:12', user: 'Admin', action: 'Edited pipeline', target: 'Added stage Negotiation' },
            ].map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-900">{row.time}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.user}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{row.action}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{row.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}