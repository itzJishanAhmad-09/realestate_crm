import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const [{ data: booking }, { data: payments }] = await Promise.all([
    supabase.from('bookings').select('*, leads(name, phone), projects(name), units(unit_number)').eq('id', params.id).maybeSingle(),
    supabase.from('payments').select('*').eq('booking_id', params.id).order('milestone_no'),
  ]);
  if (!booking) notFound();

  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
  const total = Number(booking.total_value || 0);
  const pct = total ? Math.round((paid / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">{booking.booking_number}</h1>
        <p className="text-sm text-muted-foreground">
          {booking.leads?.name} · {booking.projects?.name ?? '—'} · {booking.units?.unit_number ?? ''} · {booking.status}
        </p>
      </div>
      <div className="rounded-lg border p-3 text-sm">
        <div className="flex justify-between"><span>Total value</span><span>₹{total.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between"><span>Paid</span><span>₹{paid.toLocaleString('en-IN')} ({pct}%)</span></div>
      </div>
      <div>
        <h2 className="mb-2 text-sm font-medium">Payment milestones</h2>
        <div className="space-y-2">
          {(payments ?? []).map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">{m.milestone}</p>
                <p className="text-xs text-muted-foreground">
                  {m.due_date ? `due ${m.due_date}` : ''} {m.paid_date ? `· paid ${m.paid_date}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p>₹{Number(m.amount_due).toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">{m.status}</p>
              </div>
            </div>
          ))}
          {(payments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No milestones.</p>}
        </div>
      </div>
    </div>
  );
}
