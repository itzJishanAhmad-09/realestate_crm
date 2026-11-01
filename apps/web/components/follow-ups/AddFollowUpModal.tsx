'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { scheduleFollowUpAction } from '@/app/(app)/leads/actions';

export function AddFollowUpModal({ leads }: { leads: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leadId, setLeadId] = useState(leads[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (!leadId || !dueDate) throw new Error("Please select a lead and date");
      const res = await scheduleFollowUpAction({ lead_id: leadId, due_at: new Date(dueDate).toISOString(), channel: 'call', note });
      if (!res.ok) throw new Error(res.error);
      setOpen(false);
      router.refresh();
    } catch (err) { alert((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-md bg-[#C02B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] transition-colors">Add follow-up</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div><label className="text-[13px] font-medium text-gray-900 mb-1 block">Select Lead</label><select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required>{leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>)}</select></div>
          <div><label className="text-[13px] font-medium text-gray-900 mb-1 block">Due Date & Time</label><input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required /></div>
          <div><label className="text-[13px] font-medium text-gray-900 mb-1 block">Note (Optional)</label><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g. Call back" /></div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" className="bg-[#C02B2B] hover:bg-[#A42A22]" disabled={busy}>{busy ? 'Saving…' : 'Schedule'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}