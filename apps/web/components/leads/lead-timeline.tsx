"use client";

import { useState, useTransition } from "react";
import { addNoteAction, scheduleFollowUpAction } from "@/app/(app)/leads/actions";

type Note = { id: string; body: string; created_at: string; users?: { full_name: string | null }[] | null };
type FollowUp = { id: string; due_at: string; done_at: string | null; channel: string; note: string | null };
type Activity = { id: string; action: string; created_at: string; meta?: any };

export function LeadTimeline({
  leadId, notes, followUps, activity,
}: {
  leadId: string;
  notes: Note[];
  followUps: FollowUp[];
  activity: Activity[];
}) {
  const [tab, setTab] = useState<"notes" | "followups" | "activity">("notes");
  return (
    <div className="rounded-lg border bg-white dark:bg-slate-900">
      <div className="flex gap-1 border-b p-2 text-sm">
        <Tab active={tab === "notes"} onClick={() => setTab("notes")}>Notes ({notes.length})</Tab>
        <Tab active={tab === "followups"} onClick={() => setTab("followups")}>Follow-ups ({followUps.length})</Tab>
        <Tab active={tab === "activity"} onClick={() => setTab("activity")}>Activity ({activity.length})</Tab>
      </div>
      <div className="p-3 text-sm">
        {tab === "notes" && <NotesPane leadId={leadId} notes={notes} />}
        {tab === "followups" && <FollowUpsPane leadId={leadId} followUps={followUps} />}
        {tab === "activity" && <ActivityPane activity={activity} />}
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={"rounded px-3 py-1 " + (active ? "bg-slate-100 font-medium dark:bg-slate-800" : "text-slate-500")}
    >
      {children}
    </button>
  );
}

function NotesPane({ leadId, notes }: { leadId: string; notes: Note[] }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setErr(null);
    start(async () => {
      const res = await addNoteAction({ lead_id: leadId, body });
      if (!res.ok) return setErr(res.error);
      setBody("");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note." className="w-full rounded border p-2 dark:bg-slate-800" rows={2} />
        <button disabled={pending} className="rounded bg-indigo-600 px-3 py-1 text-xs text-white disabled:opacity-50">
          {pending ? "Saving..." : "Add note"}
        </button>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </form>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded border p-2">
            <div className="text-xs text-slate-500">
              {(n.users?.[0]?.full_name ?? "-") + " - " + new Date(n.created_at).toLocaleString()}
            </div>
            <div className="whitespace-pre-wrap">{n.body}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FollowUpsPane({ leadId, followUps }: { leadId: string; followUps: FollowUp[] }) {
  const [when, setWhen] = useState(() => toLocalInput(new Date(Date.now() + 3600_000)));
  const [channel, setChannel] = useState<"call"|"whatsapp"|"sms"|"visit"|"other">("call");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const res = await scheduleFollowUpAction({
        lead_id: leadId, due_at: new Date(when).toISOString(), channel, note,
      });
      if (!res.ok) return setErr(res.error);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2">
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
          className="w-full rounded border p-2 text-sm dark:bg-slate-800" />
        <select value={channel} onChange={(e) => setChannel(e.target.value as any)}
          className="w-full rounded border p-2 text-sm dark:bg-slate-800">
          <option value="call">Call</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
          <option value="visit">Visit</option>
          <option value="other">Other</option>
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
          className="w-full rounded border p-2 text-sm dark:bg-slate-800" />
        <button disabled={pending} className="rounded bg-indigo-600 px-3 py-1 text-xs text-white disabled:opacity-50">
          {pending ? "Saving..." : "Schedule"}
        </button>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </form>
      <ul className="space-y-2">
        {followUps.map((f) => (
          <li key={f.id} className={"rounded border p-2 " + (f.done_at ? "opacity-60" : "")}>
            <div className="text-xs text-slate-500">
              {new Date(f.due_at).toLocaleString() + " - " + f.channel + (f.done_at ? " - done" : "")}
            </div>
            {f.note && <div>{f.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityPane({ activity }: { activity: Activity[] }) {
  return (
    <ul className="space-y-2">
      {activity.map((a) => (
        <li key={a.id} className="rounded border p-2 text-xs">
          <div className="text-slate-500">{new Date(a.created_at).toLocaleString()}</div>
          <div className="font-medium">{a.action}</div>
          {a.meta && (
            <pre className="mt-1 overflow-x-auto text-[10px] text-slate-500">
              {JSON.stringify(a.meta, null, 2)}
            </pre>
          )}
        </li>
      ))}
    </ul>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
       + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
