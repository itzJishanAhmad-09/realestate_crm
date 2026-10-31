'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_GROUPS = [
  { title: 'WORK', items: [
      { href: '/dashboard', label: 'Dashboard' }, { href: '/leads', label: 'Leads' },
      { href: '/calling', label: 'Calling' }, { href: '/site-visits', label: 'Site visits' },
      { href: '/follow-ups', label: 'Follow-ups' }, { href: '/inbox', label: 'Inbox' },
  ]},
  { title: 'SALES', items: [
      { href: '/campaigns', label: 'Campaigns' }, { href: '/automations', label: 'Automations' },
      { href: '/bookings', label: 'Bookings' }, { href: '/projects', label: 'Projects' },
      { href: '/partners', label: 'Partners' },
  ]},
  { title: 'ANALYTICS', items: [
      { href: '/reports', label: 'Reports' }, { href: '/monitoring', label: 'Monitoring' },
  ]},
  { title: 'ADMIN', items: [
      { href: '/billing', label: 'Billing' }, { href: '/settings/users', label: 'Users' },
      { href: '/settings/teams', label: 'Teams' }, { href: '/settings/pipeline', label: 'Pipeline' },
      { href: '/audit-log', label: 'Audit log' },
  ]}
];

export function Sidebar({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full w-full flex-col bg-[#A42A22] text-white">
      <div className="px-6 py-8">
        <h2 className="font-serif text-2xl tracking-wide text-white">{companyName}</h2>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 px-3 text-[10px] font-bold tracking-wider text-white/50 uppercase">{group.title}</h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={`block rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${isActive ? 'bg-black/20 text-white' : 'text-white/80 hover:bg-black/10 hover:text-white'}`}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}