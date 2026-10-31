'use client';
import { useState } from 'react';
import { useReportData, RangeBar, ExportCsv, type RangeState } from '@/components/reports/ReportShell';

export default function AgentsPage() {
  const [r, setR] = useState<RangeState>({ from: '', to: '' });
  const qs = new URLSearchParams();
  if (r.from) qs.set('from', `${r.from}T00:00:00Z`);
  if (r.to)   qs.set('to',   `${r.to}T23:59:59Z`);
  const { data, loading, err } = useReportData<any[]>(`/api/reports/agents?${qs}`);

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Agent Performance</h1>
        <ExportCsv type="agents" from={r.from} to={r.to} />
      </div>
      <RangeBar onChange={setR} />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      {data && (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-1">Agent</th><th>Role</th><th>Calls</th><th>Conn.</th><th>Talk (m)</th><th>Visits</th><th>Bookings</th>
          </tr></thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="py-1">{a.name}</td>
                <td>{a.role}</td>
                <td>{a.calls}</td>
                <td>{a.connected}</td>
                <td>{Math.round((a.talk_time ?? 0) / 60)}</td>
                <td>{a.visits_booked}</td>
                <td>{a.bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
