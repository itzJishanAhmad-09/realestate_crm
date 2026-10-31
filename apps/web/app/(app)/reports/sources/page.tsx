'use client';
import { useState } from 'react';
import { useReportData, RangeBar, ExportCsv, type RangeState } from '@/components/reports/ReportShell';

export default function SourcesPage() {
  const [r, setR] = useState<RangeState>({ from: '', to: '' });
  const qs = new URLSearchParams();
  if (r.from) qs.set('from', `${r.from}T00:00:00Z`);
  if (r.to)   qs.set('to',   `${r.to}T23:59:59Z`);
  const { data, loading, err } = useReportData<any[]>(`/api/reports/sources?${qs}`);

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Sources & ROI</h1>
        <ExportCsv type="sources" from={r.from} to={r.to} />
      </div>
      <RangeBar onChange={setR} />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      {data && (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-1">Source</th><th>Leads</th><th>Visits</th><th>Bookings</th><th>Spend</th><th>CPL</th><th>Cost/Booking</th>
          </tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b">
                <td className="py-1">{row.source_name}</td>
                <td>{row.leads}</td>
                <td>{row.site_visits}</td>
                <td>{row.bookings}</td>
                <td>{row.spend}</td>
                <td>{row.cpl}</td>
                <td>{row.cpbook}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
