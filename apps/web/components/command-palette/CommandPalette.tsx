'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Users, Phone, MapPin, MessageSquare, Send, Zap, Building2, BarChart3, Wallet, UserCog, Package, Shield, Search, Plus } from 'lucide-react';

const ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: Home }, 
  { href: '/leads', label: 'Leads', icon: Users }, 
  { href: '/leads/new', label: 'New lead', icon: Plus }, 
  { href: '/calling', label: 'Calling', icon: Phone }, 
  { href: '/site-visits', label: 'Site visits', icon: MapPin }, 
  { href: '/follow-ups', label: 'Follow-ups', icon: Home }, 
  { href: '/inbox', label: 'Inbox', icon: MessageSquare }, 
  { href: '/campaigns', label: 'Campaigns', icon: Send }, 
  { href: '/automations', label: 'Automations', icon: Zap }, 
  { href: '/bookings', label: 'Bookings', icon: Package }, 
  { href: '/projects', label: 'Projects', icon: Building2 }, 
  { href: '/reports', label: 'Reports', icon: BarChart3 }, 
  { href: '/billing', label: 'Billing', icon: Wallet }, 
  { href: '/settings/users', label: 'Users', icon: UserCog }, 
  { href: '/audit-log', label: 'Audit log', icon: Shield }
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { 
        e.preventDefault(); 
        setOpen((v) => !v); 
      }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!open) return null;

  const filtered = ITEMS.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Jump to…"
            className="flex h-11 w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No results.</div>}
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => { setOpen(false); router.push(item.href); }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}