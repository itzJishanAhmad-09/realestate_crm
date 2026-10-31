'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const DAY = 86_400_000;
const STATUSES = ['scheduled', 'confirmed', 'rescheduled', 'no_show', 'done', 'canceled'] as const;

export function SiteVisitBoard({ visits }: { visits: any[] }) {
  const [view, setView] = useState<'day' | 'week'>('day');
  const [cursor, setCursor] = useState(() => new Date());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const start = useMemo(() => {
    const d = new Date(cursor); d.setHours(0, 0, 0, 0);
    if (view === 'week') d.setDate(d.getDate() - d.getDay());
    return d.getTime();
  }, [cursor, view]);

  const end = start + (view === 'day' ? DAY : 7 * DAY);
  const visible = visits.filter((v) => {
    const t = Date.parse(v.scheduled_for);
    return t >= start && t < end;
  });

  async function setStatus(id: string, status: string) {
    await fetch(`/api/site-visits/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <button className="rounded border px-2 py-1 text-sm"
          onClick={() => setCursor(new Date(start - (view === 'day' ? DAY : 7 * DAY)))}>←</button>
        <span className="text-sm font-medium">
          {new Date(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button className="rounded border px-2 py-1 text-sm"
          onClick={() => setCursor(new Date(start + (view === 'day' ? DAY : 7 * DAY)))}>→</button>
        <select className="ml-auto rounded border px-2 py-1 text-sm" value={view}
          onChange={(e) => setView(e.target.value as any)}>
          <option value="day">Day</option>
          <option value="week">Week</option>
        </select>
      </div>
      <div className="space-y-2">
        {visible.map((v) => (
          <div key={v.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{v.leads?.name} · {v.projects?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(v.scheduled_for).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  {v.pickup_required && ' · pickup'}
                  {` · ${v.visitors_count} visitor(s)`}
                </p>
              </div>
              <select className="rounded border px-2 py-1 text-xs" value={v.status}
                onChange={(e) => setStatus(v.id, e.target.value)} disabled={pending}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {v.location_url && (
              <a className="mt-1 inline-block text-xs text-primary underline" href={v.location_url} target="_blank" rel="noreferrer">
                Location
              </a>
            )}
          </div>
        ))}
        {visible.length === 0 && <p className="text-sm text-muted-foreground">No visits in this window.</p>}
      </div>
    </div>
  );
}
