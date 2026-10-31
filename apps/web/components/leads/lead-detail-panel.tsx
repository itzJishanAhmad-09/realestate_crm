"use client";

import { useState, useTransition } from "react";
import { updateLeadAction } from "@/app/(app)/leads/actions";
import { formatPhoneIN } from "@/lib/phone";

type Status = { id: string; label: string; category: string; sort_order: number };

export function LeadDetailPanel({ lead, statuses }: { lead: any; statuses: Status[] }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState<string>("");

  function changeStatus(statusId: string) {
    setErr(null);
    const target = statuses.find((s) => s.id === statusId);
    if (target?.category === "lost" && !lostReason.trim()) {
      setErr("Lost reason is required");
      return;
    }
    start(async () => {
      const res = await updateLeadAction({
        id: lead.id,
        status_id: statusId,
        lost_reason: target?.category === "lost" ? lostReason.trim() : undefined,
      });
      if (!res.ok) setErr(res.error);
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4 dark:bg-slate-900">
      <div>
        <h1 className="text-xl font-semibold">{lead.name}</h1>
        <div className="text-sm text-slate-500">
          {formatPhoneIN(lead.phone)}{lead.alt_phone ? " - " + formatPhoneIN(lead.alt_phone) : ""}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Row label="Status" value={lead.status?.label ?? "-"} />
        <Row label="Source" value={lead.source?.label ?? "-"} />
        <Row label="Project" value={lead.project?.name ?? "-"} />
        <Row label="Assigned" value={lead.assignee?.full_name ?? "-"} />
        <Row label="Budget" value={fmtBudget(lead.budget_min, lead.budget_max)} />
        <Row label="City" value={lead.city ?? "-"} />
        <Row label="Locality" value={lead.locality ?? "-"} />
        <Row label="Property type" value={lead.property_type ?? "-"} />
      </dl>

      <div className="space-y-2 border-t pt-3">
        <label className="block text-xs uppercase text-slate-500">Change status</label>
        <select
          defaultValue=""
          disabled={pending}
          onChange={(e) => e.target.value && changeStatus(e.target.value)}
          className="w-full rounded border p-2 dark:bg-slate-800"
        >
          <option value="">- pick a status -</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <input
          placeholder="Lost reason (if moving to Lost)"
          value={lostReason}
          onChange={(e) => setLostReason(e.target.value)}
          className="w-full rounded border p-2 text-sm dark:bg-slate-800"
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>

      {lead.remarks && (
        <div className="border-t pt-3 text-sm">
          <div className="text-xs uppercase text-slate-500">Remarks</div>
          <p className="mt-1 whitespace-pre-wrap">{lead.remarks}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function fmtBudget(min?: number | null, max?: number | null) {
  if (!min && !max) return "-";
  const f = (n: number) => "Rs " + (n / 100000).toFixed(1) + "L";
  if (min && max) return f(min) + " - " + f(max);
  return f((min ?? max)!);
}
