"use client";

import { useState } from "react";
import { parseCsvFile, mapRows, type ColumnMapping, type MappedRow } from "@/lib/csv";
import { importLeadsAction, createImportJobAction } from "../actions";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [preview, setPreview] = useState<MappedRow[]>([]);
  const [dedupeMode, setDedupeMode] = useState<"skip"|"update">("skip");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function onFile(f: File) {
    const { headers, rows } = await parseCsvFile(f);
    setFile(f); setHeaders(headers); setRawRows(rows);
    // Auto-map obvious columns
    const auto: Partial<ColumnMapping> = {};
    for (const h of headers) {
      const k = h.toLowerCase();
      if (k.includes("name")) auto.name = h;
      else if (k.includes("phone") || k.includes("mobile")) auto.phone = auto.phone ?? h;
      else if (k.includes("email")) auto.email = h;
      else if (k.includes("budget") && k.includes("min")) auto.budget_min = h;
      else if (k.includes("budget") && k.includes("max")) auto.budget_max = h;
      else if (k.includes("city")) auto.city = h;
      else if (k.includes("locality") || k.includes("location")) auto.locality = h;
    }
    setMapping(auto);
    if (auto.name && auto.phone) setPreview(mapRows(rows.slice(0, 20), auto as ColumnMapping));
  }

  function onMappingChange(field: keyof ColumnMapping, header: string) {
    const next = { ...mapping, [field]: header || undefined };
    setMapping(next);
    if (next.name && next.phone) setPreview(mapRows(rawRows.slice(0, 20), next as ColumnMapping));
  }

  async function onImport() {
    if (!file || !mapping.name || !mapping.phone) return;
    setBusy(true); setSummary(null);
    try {
      const job = await createImportJobAction({ file_name: file.name, total_rows: rawRows.length, dedupe_mode: dedupeMode });
      if (!job.ok || !job.id) { setSummary(job.ok ? "Job failed" : job.error); return; }
      const rows = mapRows(rawRows, mapping as ColumnMapping).filter((r) => !r.error);
      const res = await importLeadsAction({
        job_id: job.id,
        rows: rows.map(({ error, row_index, source_hint, project_hint, ...r }) => ({ ...r, source_hint, project_hint })),
        dedupe_mode: dedupeMode,
      });
      setSummary(res.ok ? `Import completed. Refreshing list…` : res.error);
      if (res.ok) window.location.href = "/leads";
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Import leads</h1>

      <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        className="block w-full rounded border p-2 dark:bg-slate-800" />

      {!!headers.length && (
        <>
          <div className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 md:grid-cols-2 dark:bg-slate-900">
            {(["name","phone","email","alt_phone","city","locality","budget_min","budget_max","property_type","source","project","remarks"] as const).map((f) => (
              <div key={f}>
                <label className="text-xs uppercase text-slate-500">{f}</label>
                <select value={mapping[f] ?? ""} onChange={(e) => onMappingChange(f, e.target.value)}
                  className="w-full rounded border p-2 dark:bg-slate-800">
                  <option value="">— none —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select value={dedupeMode} onChange={(e) => setDedupeMode(e.target.value as any)}
              className="rounded border p-2 dark:bg-slate-800">
              <option value="skip">Skip duplicates</option>
              <option value="update">Update existing</option>
            </select>
            <button onClick={onImport} disabled={busy || !mapping.name || !mapping.phone}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {busy ? "Importing..." : `Import ${rawRows.length} rows`}
            </button>
            {summary && <span className="text-sm text-slate-600">{summary}</span>}
          </div>

          <h2 className="text-lg font-medium">Preview (first 20)</h2>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th><th className="p-2 text-left">City</th><th className="p-2 text-left">Error</th></tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.row_index} className="border-t">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.phone}</td>
                    <td className="p-2">{r.city ?? ""}</td>
                    <td className="p-2 text-red-600">{r.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}