export default function TeamsPage() {
  const teams = [
    { name: 'Noida Sales', lead: 'Meena', count: 5, projects: 'Sector 141, Sector 150' },
    { name: 'Expressway', lead: 'Farhan', count: 4, projects: 'Expressway Heights' },
    { name: 'Greater Noida West', lead: '[Name]', count: 3, projects: 'West Greens' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Teams</h1>
          <p className="text-sm text-gray-500 mt-1">Sample data</p>
        </div>
        <button className="rounded-md bg-[#C02B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] transition-colors">New team</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((t, i) => (
          <div key={i} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col h-36">
            <h2 className="font-serif text-xl text-gray-900 mb-3">{t.name}</h2>
            <p className="text-[13px] text-gray-500 mb-1">Lead: {t.lead}</p>
            <p className="text-[13px] text-gray-600 mt-auto">{t.count} members · {t.projects}</p>
          </div>
        ))}
      </div>
    </div>
  );
}