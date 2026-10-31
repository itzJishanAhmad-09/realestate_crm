'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function CampaignsClient({ campaigns, waTemplates, smsTemplates }: {
  campaigns: any[]; waTemplates: any[]; smsTemplates: any[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [templateId, setTemplateId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, channel,
          waTemplateId: channel === 'whatsapp' ? templateId : undefined,
          smsTemplateId: channel === 'sms' ? templateId : undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'create_failed');
      startTransition(() => router.refresh());
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function send(id: string) {
    setErr(null); setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'send_failed');
      startTransition(() => router.refresh());
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-lg font-semibold">Campaigns</h1>

      <form onSubmit={create} className="space-y-2 rounded-lg border p-4">
        <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Campaign name"
               value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex gap-2">
          <select className="rounded border px-3 py-2 text-sm" value={channel}
                  onChange={(e) => { setChannel(e.target.value as any); setTemplateId(''); }}>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
          <select className="flex-1 rounded border px-3 py-2 text-sm" value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)} required>
            <option value="">— pick template —</option>
            {(channel === 'whatsapp' ? waTemplates : smsTemplates).map((t) => (
              <option key={t.id} value={t.id}>{t.display_name}</option>
            ))}
          </select>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                disabled={busy || pending}>
          {busy ? 'Creating…' : 'Create campaign'}
        </button>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </form>

      <div className="space-y-2">
        {campaigns.map((c) => (
          <div key={c.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.channel} · {c.status} · {c.total_recipients} recipients
                </p>
              </div>
              {c.status === 'draft' && (
                <button onClick={() => send(c.id)} disabled={busy}
                        className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50">
                  Send now
                </button>
              )}
            </div>
            {c.status !== 'draft' && (
              <p className="mt-2 text-xs">
                sent {c.sent_count} · failed {c.failed_count} · skipped {c.skipped_count}
              </p>
            )}
          </div>
        ))}
        {campaigns.length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
      </div>
    </div>
  );
}
