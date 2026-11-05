'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BookingForm({
  defaultLeadId,
  defaultProjectId,
}: {
  defaultLeadId?: string;
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const [leadId, setLeadId] = useState(defaultLeadId || '');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [unitId, setUnitId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId, projectId: projectId || undefined, unitId: unitId || undefined,
          basePrice: Number(basePrice), totalValue: Number(totalValue), tokenAmount: Number(tokenAmount),
          applicant: { name, phone },
          paymentPlan: [
            { milestone: 'Token', percent: 10 },
            { milestone: 'Agreement', percent: 20 },
            { milestone: 'On possession', percent: 70 },
          ],
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'create_failed');
      router.push('/bookings/' + j.id);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border p-4">
      <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Lead ID (uuid)"
             value={leadId} onChange={(e) => setLeadId(e.target.value)} required />
      <div className="flex gap-2">
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Project ID (optional)"
               value={projectId} onChange={(e) => setProjectId(e.target.value)} />
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Unit ID (optional)"
               value={unitId} onChange={(e) => setUnitId(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Base price"
               type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Total value"
               type="number" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} required />
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Token amount"
               type="number" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} required />
      </div>
      <div className="flex gap-2">
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Applicant name"
               value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Applicant phone"
               value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              disabled={busy}>
        {busy ? 'Creating…' : 'Create booking'}
      </button>
    </form>
  );
}