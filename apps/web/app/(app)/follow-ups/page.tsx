import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FollowUpsClient } from '@/components/follow-ups/FollowUpsClient';
import { AddFollowUpModal } from '@/components/follow-ups/AddFollowUpModal';

export default async function FollowUpsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) redirect('/login');
  const cid = profile.company_id;

  const [{ data: followUps }, { data: leads }, { data: users }, { data: statuses }] = await Promise.all([
    supabase.from('follow_ups').select('*').eq('company_id', cid).is('done_at', null).order('due_at', { ascending: true }).limit(100),
    supabase.from('leads').select('id, name, phone, status_id').eq('company_id', cid),
    supabase.from('users').select('id, full_name').eq('company_id', cid),
    supabase.from('lead_statuses').select('id, label').eq('company_id', cid)
  ]);

  const enrichedFollowUps = (followUps ?? []).map((f: any) => {
    const lead = leads?.find((l: any) => l.id === f.lead_id);
    const status = statuses?.find((s: any) => s.id === lead?.status_id);
    return { ...f, leads: lead ? { ...lead, lead_statuses: status } : null, users: users?.find((u: any) => u.id === f.assignee_id) || null };
  });

  return (
    <div className="relative">
      <div className="absolute top-8 right-8 md:right-10 z-10">
        <AddFollowUpModal leads={leads ?? []} />
      </div>
      <FollowUpsClient followUps={enrichedFollowUps} />
    </div>
  );
}