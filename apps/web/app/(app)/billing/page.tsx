export default function BillingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Sample data</p>
        </div>
        <button className="rounded-md bg-[#C02B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] transition-colors">Upgrade plan</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="font-serif text-2xl text-gray-900 mb-4">Plan</h2>
          <p className="text-xl font-semibold text-gray-900">[Plan name]</p>
          <p className="text-sm text-gray-500 mt-1">[₹ amount] per month · renews [date]</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="font-serif text-2xl text-gray-900 mb-6">Usage</h2>
          <div className="space-y-4">
            {[
              { label: 'Calling minutes', pct: 70, value: '70%' },
              { label: 'WhatsApp', pct: 45, value: '45%' },
              { label: 'Seats', pct: 80, value: '8/10' },
            ].map((row) => (
              <div key={row.label} className="flex items-center text-sm">
                <span className="w-32 text-gray-600">{row.label}</span>
                <div className="flex-1 mx-4 h-2.5 rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-full bg-[#C02B2B] rounded-full" style={{ width: `${row.pct}%` }} />
                </div>
                <span className="w-10 text-right font-medium text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Invoice</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { id: 'INV-001', date: '[date]', amount: '[₹ amount]' },
              { id: 'INV-002', date: '[date]', amount: '[₹ amount]' },
            ].map((inv, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.id}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{inv.date}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{inv.amount}</td>
                <td className="px-6 py-4"><span className="inline-flex items-center rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[11px] font-medium text-[#2E7D32]">Completed</span></td>
                <td className="px-6 py-4 text-right"><button className="rounded-md border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}