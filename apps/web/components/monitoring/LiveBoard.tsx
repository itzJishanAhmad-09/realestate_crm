'use client';
import { useEffect, useState } from 'react';

interface Data {
  presence: { user_id: string; status: string; last_seen_at: string; current_call_id: string | null; users: { name: string; role: string } | null }[];
  activeCalls: { id: string; agent_id: string; lead_id: string; status: string; started_at: string; leads: { name: string; phone: string } | null }[];
  asOf: string;
}

export function LiveBoard() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch('/api/presence/live');
        if (!r.ok) throw new Error((await r.json()).error ?? 'fetch_failed');
        if (!stop) setData(await r.json());
      } catch (e) { if (!stop) setErr((e as Error).message); }
    };
    tick();
    const t = setInterval(tick, 15_000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-sm font-medium">Active calls ({data.activeCalls.length})</h2>
        <div className="space-y-2">
          {data.activeCalls.map((c) => (
            <div key={c.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{c.leads?.name ?? 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">
                {c.status} · started {new Date(c.started_at).toLocaleTimeString('en-IN')}
              </p>
            </div>
          ))}
          {data.activeCalls.length === 0 && <p className="text-sm text-muted-foreground">No active calls.</p>}
        </div>
      </div>
      <div>
        <h2 className="mb-2 text-sm font-medium">Agents ({data.presence.length})</h2>
        <div className="space-y-2">
          {data.presence.map((p) => (
            <div key={p.user_id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span>{p.users?.name ?? p.user_id.slice(0, 8)} <span className="text-muted-foreground">({p.users?.role})</span></span>
              <span className={p.status === 'on_call' ? 'text-primary' : 'text-muted-foreground'}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">as of {new Date(data.asOf).toLocaleTimeString('en-IN')}</p>
    </div>
  );
}
