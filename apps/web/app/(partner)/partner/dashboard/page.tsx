import { createServerClient } from '@/lib/supabase/server';

export default async function PartnerDashboard() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: leads }, { data: bookings }, { data: commissions }] = await Promise.all([
    supabase.from('leads').select('id, name, phone, status_id').eq('submitted_by_partner_id', user.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('bookings').select('id, booking_number, status, total_value').limit(50),
    supabase.from('channel_partner_commissions').select('id, commission, status, booking_id').eq('partner_id', user.id),
  ]);

  const totalCommission = (commissions ?? []).reduce((s, c) => s + Number(c.commission || 0), 0);
  const paidCommission = (commissions ?? []).filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.commission || 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Partner dashboard</h1>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border p-3"><p className="text-muted-foreground">My leads</p><p className="text-lg font-semibold">{leads?.length ?? 0}</p></div>
        <div className="rounded-lg border p-3"><p className="text-muted-foreground">Bookings</p><p className="text-lg font-semibold">{bookings?.length ?? 0}</p></div>
        <div className="rounded-lg border p-3"><p className="text-muted-foreground">Commission (total)</p><p className="text-lg font-semibold">₹{totalCommission.toLocaleString('en-IN')}</p></div>
        <div className="rounded-lg border p-3"><p className="text-muted-foreground">Commission (paid)</p><p className="text-lg font-semibold">₹{paidCommission.toLocaleString('en-IN')}</p></div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">My leads</h2>
        <div className="space-y-2">
          {(leads ?? []).map((l) => (
            <div key={l.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{l.name}</p>
              <p className="text-xs text-muted-foreground">{l.phone}</p>
            </div>
          ))}
          {(leads ?? []).length === 0 && <p className="text-sm text-muted-foreground">No leads submitted yet.</p>}
        </div>
      </div>
    </div>
  );
}
