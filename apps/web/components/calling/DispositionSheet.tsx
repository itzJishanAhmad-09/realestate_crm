'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Disp = { id: string; code: string; label: string; requires_notes: boolean };

export function DispositionSheet({
  callId, dispositions, onDone,
}: { callId: string; dispositions: Disp[]; onDone: () => void }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Disp | null>(null);
  const [notes, setNotes] = useState('');
  const [followupAt, setFollowupAt] = useState<string>('');
  const [visitOpen, setVisitOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(extra?: { siteVisit?: unknown }) {
    if (!selected) return;
    if (selected.requires_notes && notes.trim().length < 3) { setErr('Notes are required.'); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/calls/${callId}/disposition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispositionId: selected.id, notes,
          nextFollowupAt: followupAt ? new Date(followupAt).toISOString() : undefined,
          siteVisit: extra?.siteVisit,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'save_failed');
      }
      router.refresh(); onDone();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {dispositions.map((d) => (
          <button key={d.id} onClick={() => setSelected(d)}
            className={`rounded-lg border px-3 py-2 text-sm ${selected?.id === d.id ? 'border-primary bg-primary/10' : 'border-border'}`}>
            {d.label}
          </button>
        ))}
      </div>
      <textarea className="w-full rounded-lg border p-2 text-sm"
        placeholder="Notes (required for some outcomes)" rows={3}
        value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex items-center gap-2 text-sm">
        <label className="text-muted-foreground">Next follow-up</label>
        <input type="datetime-local" className="rounded border px-2 py-1"
          value={followupAt} onChange={(e) => setFollowupAt(e.target.value)} />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex gap-2">
        <button disabled={!selected || saving} onClick={() => submit()}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
          {saving ? 'Saving…' : 'Save & next'}
        </button>
        <button onClick={() => setVisitOpen((v) => !v)} className="rounded-lg border px-4 py-2 text-sm">
          + Book site visit
        </button>
      </div>
      {visitOpen && selected && (
        <SiteVisitInlineForm onSubmit={(visit) => submit({ siteVisit: visit })} onCancel={() => setVisitOpen(false)} />
      )}
    </div>
  );
}

function SiteVisitInlineForm({ onSubmit, onCancel }: { onSubmit: (v: unknown) => void; onCancel: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [when, setWhen] = useState('');
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <input placeholder="Project ID" className="w-full rounded border px-2 py-1 text-sm"
        value={projectId} onChange={(e) => setProjectId(e.target.value)} />
      <input type="datetime-local" className="w-full rounded border px-2 py-1 text-sm"
        value={when} onChange={(e) => setWhen(e.target.value)} />
      <div className="flex gap-2">
        <button className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
          onClick={() => onSubmit({ projectId, scheduledFor: new Date(when).toISOString() })}>
          Confirm visit
        </button>
        <button className="rounded border px-3 py-1 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
