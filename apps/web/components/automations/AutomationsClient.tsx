'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const TRIGGERS = ['lead_created','lead_status_changed','lead_assigned','site_visit_scheduled','site_visit_completed','follow_up_due'] as const;
const ACTIONS = ['send_wa_template','send_sms_template','create_followup','assign_user','add_tag','set_status','create_reminder'] as const;

export function AutomationsClient({ automations }: { automations: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<typeof TRIGGERS[number]>('lead_created');
  const [actionType, setActionType] = useState<typeof ACTIONS[number]>('create_followup');
  const [actionConfigText, setActionConfigText] = useState('{"minutes_from_now":60}');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const actionConfig = JSON.parse(actionConfigText || '{}');
      const res = await fetch('/api/automations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, triggerType, triggerConfig: {}, actionType, actionConfig }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'create_failed');
      startTransition(() => router.refresh());
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function toggle(id: string, isActive: boolean) {
    await fetch(`/api/automations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-lg font-semibold">Automations</h1>

      <form onSubmit={create} className="space-y-2 rounded-lg border p-4">
        <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Automation name"
               value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex gap-2">
          <select className="flex-1 rounded border px-3 py-2 text-sm" value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as any)}>
            {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="flex-1 rounded border px-3 py-2 text-sm" value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <textarea className="w-full rounded border px-3 py-2 font-mono text-xs" rows={3}
                  placeholder='{"minutes_from_now":60}'
                  value={actionConfigText} onChange={(e) => setActionConfigText(e.target.value)} />
        <button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                disabled={busy || pending}>
          {busy ? 'Creating…' : 'Create automation'}
        </button>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </form>

      <div className="space-y-2">
        {automations.map((a) => (
          <div key={a.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.trigger_type} → {a.action_type}
                </p>
              </div>
              <button onClick={() => toggle(a.id, a.is_active)} disabled={pending}
                      className={`rounded px-3 py-1 text-xs ${a.is_active ? 'bg-primary text-primary-foreground' : 'border'}`}>
                {a.is_active ? 'Active' : 'Paused'}
              </button>
            </div>
          </div>
        ))}
        {automations.length === 0 && <p className="text-sm text-muted-foreground">No automations yet.</p>}
      </div>
    </div>
  );
}
