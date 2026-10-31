'use client';
import { useState } from 'react';
import { useReportData, RangeBar, ExportCsv, type RangeState } from '@/components/reports/ReportShell';

const STAGES: [string, string][] = [
  ['total', 'Total leads'], ['contacted', 'Contacted'],
  ['interested', 'Interested'], ['visit_scheduled', 'Visit scheduled'],
  ['visited', 'Visited'], ['booked', 'Booked'], ['won', 'Won'],
];

export default function FunnelPage() {
  const [r, setR] = useState<RangeState>({ from: '', to: '' });
  const qs = new URLSearchParams();
  if (r.from) qs.set('from', `${r.from}T00:00:00Z`);
  if (r.to)   qs.set('to',   `${r.to}T23:59:59Z`);
  const { data, loading, err } = useReportData<Record<string, number>>(`/api/reports/funnel?${qs}`);
  const total = data?.total ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Funnel</h1>
        <ExportCsv type="funnel" from={r.from} to={r.to} />
      </div>
      <RangeBar onChange={setR} />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      {data && (
        <div className="space-y-2">
          {STAGES.map(([k, label]) => {
            const v = data[k] ?? 0;
            const pct = total ? Math.round((v / total) * 100) : 0;
            return (
              <div key={k}>
                <div className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span>{v} <span className="text-muted-foreground">({pct}%)</span></span>
                </div>
                <div className="h-2 rounded bg-muted">
                  <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
