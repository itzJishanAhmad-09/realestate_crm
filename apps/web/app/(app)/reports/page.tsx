import Link from 'next/link';

export default function ReportsPage() {
  const links = [
    { href: '/reports/funnel', label: 'Funnel', desc: 'Leads → contacted → interested → visited → booked' },
    { href: '/reports/sources', label: 'Sources & ROI', desc: 'Leads, CPL, cost per booking by source' },
    { href: '/reports/agents', label: 'Agent Performance', desc: 'Calls, connected, talk time, visits, bookings' },
    { href: '/reports/projects', label: 'Projects', desc: 'Demand + inventory by project' },
  ];
  
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div>
        <h1 className="font-serif text-4xl text-gray-900 leading-tight">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Sample data</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="block rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:border-[#A42A22] transition-colors">
            <p className="font-serif text-xl text-gray-900 mb-2">{l.label}</p>
            <p className="text-[13px] text-gray-500">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}