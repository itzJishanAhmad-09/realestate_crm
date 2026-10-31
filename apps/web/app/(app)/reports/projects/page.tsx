'use client';
import { useState } from 'react';
import { useReportData, RangeBar, ExportCsv, type RangeState } from '@/components/reports/ReportShell';

export default function ProjectsPage() {
  const [r, setR] = useState<RangeState>({ from: '', to: '' });
  const qs = new URLSearchParams();
  if (r.from) qs.set('from', `${r.from}T00:00:00Z`);
  if (r.to)   qs.set('to',   `${r.to}T23:59:59Z`);
  const { data, loading, err } = useReportData<any[]>(`/api/reports/projects?${qs}`);

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Projects</h1>
        <ExportCsv type="projects" from={r.from} to={r.to} />
      </div>
      <RangeBar onChange={setR} />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      {data && (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-1">Project</th><th>Leads</th><th>Visits</th><th>Bookings</th><th>Available</th><th>Booked</th>
          </tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-1">{p.name}</td>
                <td>{p.leads}</td>
                <td>{p.visits}</td>
                <td>{p.bookings}</td>
                <td>{p.units_available}</td>
                <td>{p.units_booked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
