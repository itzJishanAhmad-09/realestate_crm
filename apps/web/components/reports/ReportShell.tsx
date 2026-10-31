'use client';
import { useEffect, useState } from 'react';

export interface RangeState { from: string; to: string }

export function useReportData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true); setErr(null);
    fetch(url).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error ?? 'load_failed');
      return r.json();
    }).then(setData).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [url]);
  return { data, loading, err };
}

export function RangeBar({ onChange }: { onChange: (r: RangeState) => void }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return (
    <div className="mb-3 flex items-center gap-2 text-sm">
      <label>From</label>
      <input type="date" className="rounded border px-2 py-1" value={from}
             onChange={(e) => { setFrom(e.target.value); onChange({ from: e.target.value, to }); }} />
      <label>To</label>
      <input type="date" className="rounded border px-2 py-1" value={to}
             onChange={(e) => { setTo(e.target.value); onChange({ from, to: e.target.value }); }} />
    </div>
  );
}

export function ExportCsv({ type, from, to }: { type: string; from: string; to: string }) {
  const qs = new URLSearchParams({ type });
  if (from) qs.set('from', `${from}T00:00:00Z`);
  if (to)   qs.set('to',   `${to}T23:59:59Z`);
  return (
    <a className="rounded border px-3 py-1 text-xs" href={`/api/reports/export?${qs}`}>
      Export CSV
    </a>
  );
}
