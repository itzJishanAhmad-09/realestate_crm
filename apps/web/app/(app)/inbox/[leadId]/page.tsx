import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { InboxThreadClient } from '@/components/whatsapp/InboxThreadClient';

export default async function ThreadPage({ params }: { params: { leadId: string } }) {
  const supabase = createServerClient();
  const [{ data: lead }, { data: msgs }] = await Promise.all([
    supabase.from('leads').select('id, name, phone').eq('id', params.leadId).maybeSingle(),
    supabase.from('messages').select('*').eq('lead_id', params.leadId).order('created_at', { ascending: true }),
  ]);

  if (!lead) return <div className="p-4 text-sm text-muted-foreground">Lead not found.</div>;

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between border-b pb-2">
        <div>
          <Link href="/inbox" className="text-xs text-muted-foreground underline">← Inbox</Link>
          <p className="text-lg font-semibold">{lead.name}</p>
          <p className="text-xs text-muted-foreground">{lead.phone}</p>
        </div>
        <Link href={`/leads/${lead.id}`} className="text-xs text-primary underline">Open lead</Link>
      </div>
      <InboxThreadClient leadId={lead.id} initial={msgs ?? []} />
    </div>
  );
}
