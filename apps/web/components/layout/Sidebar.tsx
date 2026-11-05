'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  ['/dashboard', 'Dashboard'],
  ['/leads', 'Leads'],
  ['/calling', 'Calling'],
  ['/site-visits', 'Site visits'],
  ['/follow-ups', 'Follow-ups'],
  ['/bookings', 'Bookings'],
  ['/projects', 'Projects'],
  ['/settings', 'Settings'],
];

export function Sidebar({ companyName }: { companyName: string }) {
  const p = usePathname();
  return (
    <div className="h-full w-full bg-[#A42A22] text-white p-4">
      <h2 className="font-serif text-2xl mb-6">{companyName}</h2>
      <ul className="space-y-1">
        {LINKS.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className={'block rounded px-3 py-1.5 text-sm ' + (p === href ? 'bg-black/20' : 'hover:bg-black/10')}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
