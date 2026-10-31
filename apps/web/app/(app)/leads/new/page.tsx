'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { createLeadAction } from '../actions';
import { toast } from 'sonner';

export default function NewLeadPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [busy, setBusy] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      // 1. Fetch the "New" status ID from the DB
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user!.id).single();
      const { data: status } = await supabase.from('lead_statuses').select('id').eq('company_id', profile!.company_id).eq('key', 'new').single();

      if (!status) throw new Error("Pipeline status 'New' not found. Please check your database.");

      // 2. Call the secure Server Action
      const res = await createLeadAction({
        name,
        phone, // The action auto-formats this to +91
        email: email || undefined,
        budget_min: budgetMin ? parseInt(budgetMin) : undefined,
        budget_max: budgetMax ? parseInt(budgetMax) : undefined,
        status_id: status.id,
        tags: [],
        custom_fields: {},
      });

      if (!res.ok) {
        throw new Error(res.error);
      }

      toast.success('Lead created successfully!');
      router.push('/leads');
      router.refresh();

    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10 bg-[#FDFBF7] min-h-screen">
      <h1 className="mb-6 font-serif text-3xl text-gray-900">Create New Lead</h1>
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-900">Full Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#A42A22] focus:outline-none" placeholder="e.g. Rahul Sharma" />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-900">Phone Number *</label>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#A42A22] focus:outline-none" placeholder="9876543210" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-gray-900">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#A42A22] focus:outline-none" placeholder="rahul@example.com" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-900">Budget Min (₹)</label>
              <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#A42A22] focus:outline-none" placeholder="5000000" />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-900">Budget Max (₹)</label>
              <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#A42A22] focus:outline-none" placeholder="8000000" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => router.back()} className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-md bg-[#C02B2B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#A42A22] disabled:opacity-50">
              {busy ? 'Creating…' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}