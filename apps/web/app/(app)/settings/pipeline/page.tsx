export default function PipelinePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">Sample data</p>
        </div>
        <button className="rounded-md bg-[#C02B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] transition-colors">Add stage</button>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="space-y-4">
          {[
            { label: 'New', days: '0 days', color: 'bg-[#FFEBEE] text-[#C62828]' },
            { label: 'Contacted', days: '1 days', color: 'bg-[#E3F2FD] text-[#1565C0]' },
            { label: 'Interested', days: '2 days', color: 'bg-[#E8F5E9] text-[#2E7D32]' },
            { label: 'Site visit scheduled', days: '3 days', color: 'bg-[#FFF8E1] text-[#F57F17]' },
            { label: 'Site visit done', days: '2 days', color: 'bg-[#F3E5F5] text-[#6A1B9A]' },
            { label: 'Negotiation', days: '3 days', color: 'bg-[#FFF3E0] text-[#E65100]' },
            { label: 'Booked', days: '0 days', color: 'bg-[#E8F5E9] text-[#2E7D32]' },
          ].map((stage, i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-3 w-1/3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${stage.color}`}>{stage.label}</span>
              </div>
              <div className="flex-1 mx-4 h-2 rounded-full bg-stone-100 overflow-hidden max-w-xs">
                <div className="h-full bg-[#C02B2B] rounded-full" style={{ width: `${100 - i * 12}%` }} />
              </div>
              <span className="text-[13px] font-medium text-gray-500 w-16 text-right">{stage.days}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}