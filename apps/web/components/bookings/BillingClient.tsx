'use client';
import { useState } from 'react';
import Script from 'next/script';

declare global { interface Window { Razorpay?: any } }

const PRICES: Record<string, number> = { starter: 299, growth: 499, scale: 999 };

export function BillingClient({ subscription, canManage }: { subscription: any | null; canManage: boolean }) {
  const [plan, setPlan] = useState<'starter'|'growth'|'scale'>(subscription?.plan_name ?? 'growth');
  const [seats, setSeats] = useState<number>(subscription?.seats ?? 5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function checkout() {
    setErr(null); setBusy(true);
    try {
      const r = await fetch('/api/subscriptions/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName: plan, seats }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'order_failed');
      if (!window.Razorpay) throw new Error('razorpay_checkout_not_loaded');
      const rz = new window.Razorpay({
        key: j.keyId, amount: j.amountPaise, currency: 'INR',
        name: 'RealtyCRM', description: `${j.planName} · ${j.seats} seats`,
        order_id: j.orderId,
        handler: async (response: any) => {
          const v = await fetch('/api/subscriptions/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          if (!v.ok) setErr('payment_verify_failed'); else window.location.reload();
        },
        theme: { color: '#111111' },
      });
      rz.open();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {subscription ? (
        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <div className="flex justify-between"><span>Plan</span><span>{subscription.plan_name}</span></div>
          <div className="flex justify-between"><span>Seats</span><span>{subscription.seats}</span></div>
          <div className="flex justify-between"><span>Amount / seat</span><span>₹{subscription.amount_per_seat}</span></div>
          <div className="flex justify-between"><span>Status</span><span>{subscription.status}</span></div>
          <div className="flex justify-between"><span>Last paid</span><span>₹{subscription.amount_last_paid ?? 0}</span></div>
        </div>
      ) : <p className="text-sm text-muted-foreground">No subscription yet.</p>}

      {canManage && (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm font-medium">Change plan</p>
          <div className="flex gap-2">
            <select className="rounded border px-2 py-1 text-sm" value={plan}
                    onChange={(e) => setPlan(e.target.value as any)}>
              <option value="starter">Starter (₹299/seat)</option>
              <option value="growth">Growth (₹499/seat)</option>
              <option value="scale">Scale (₹999/seat)</option>
            </select>
            <input className="w-24 rounded border px-2 py-1 text-sm" type="number" min={1} max={500}
                   value={seats} onChange={(e) => setSeats(Number(e.target.value) || 1)} />
            <span className="self-center text-sm text-muted-foreground">
              = ₹{(PRICES[plan] * seats).toLocaleString('en-IN')}/mo
            </span>
          </div>
          <button onClick={checkout} disabled={busy}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            {busy ? 'Opening checkout…' : 'Pay with Razorpay'}
          </button>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      )}
    </>
  );
}
