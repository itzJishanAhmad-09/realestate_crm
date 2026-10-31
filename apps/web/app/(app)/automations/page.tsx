export default function AutomationsPage() {
  const rules = [
    { title: 'New lead arrives', desc: 'When this happens, then: Assign to agent round-robin', on: true },
    { title: 'Call not answered', desc: 'When this happens, then: Retry after 2 hours, up to 3 times', on: true },
    { title: 'Site visit booked', desc: 'When this happens, then: Send WhatsApp reminder 1 day before', on: true },
    { title: 'Lead idle for 7 days', desc: 'When this happens, then: Move to Cold and notify team lead', on: false },
    { title: 'Booking confirmed', desc: 'When this happens, then: Send payment link and welcome message', on: true },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Automations</h1>
          <p className="text-sm text-gray-500 mt-1">Sample data</p>
        </div>
        <button className="rounded-md bg-[#C02B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] transition-colors">New automation</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rules.map((rule, i) => (
          <div key={i} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-40">
            <div>
              <h2 className="font-serif text-xl text-gray-900 mb-2">{rule.title}</h2>
              <p className="text-[13px] text-gray-600 leading-relaxed">{rule.desc}</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={rule.on} 
                readOnly
                className="h-4 w-4 rounded border-gray-300 text-[#C02B2B] focus:ring-[#C02B2B]" 
              />
              <span className="text-[13px] font-medium text-gray-900">{rule.on ? 'On' : 'Off'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}