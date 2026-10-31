"use client";

import Link from "next/link";
import { formatPhoneIN } from "@/lib/phone";

type Row = {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  locality: string | null;
  budget_min: number | null;
  budget_max: number | null;
  next_followup_at: string | null;
  created_at: string;
  status: { id: string; label: string; color: string; category: string } | null;
  source: { id: string; label: string } | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; full_name: string } | null;
};

export function LeadTable({ rows }: { rows: Row[] }) {
  if (!rows.length) return <div className="rounded-lg border p-8 text-center text-slate-500">No leads found.</div>;
  return (
    <div className="overflow-x-auto rounded-lg border bg-white dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
          <tr>
            <th className="p-3">Name / Phone</th>
            <th className="p-3">Status</th>
            <th className="p-3">Project</th>
            <th className="p-3">Budget</th>
            <th className="p-3">Source</th>
            <th className="p-3">Assigned</th>
            <th className="p-3">Next follow-up</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800">
              <td className="p-3">
                <Link href={`/leads/${r.id}`} className="font-medium text-indigo-600 hover:underline">{r.name}</Link>
                <div className="text-xs text-slate-500">{formatPhoneIN(r.phone)}</div>
              </td>
              <td className="p-3">
                {r.status && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{r.status.label}</span>
                )}
              </td>
              <td className="p-3">{r.project?.name ?? "—"}</td>
              <td className="p-3">
                {r.budget_min || r.budget_max
                  ? `₹${fmtINR(r.budget_min)} – ₹${fmtINR(r.budget_max)}`
                  : "—"}
              </td>
              <td className="p-3">{r.source?.label ?? "—"}</td>
              <td className="p-3">{r.assignee?.full_name ?? "—"}</td>
              <td className="p-3">{r.next_followup_at ? new Date(r.next_followup_at).toLocaleString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtINR(v: number | null) {
  if (!v) return "0";
  if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `${(v / 100_000).toFixed(0)}L`;
  return v.toLocaleString("en-IN");
}