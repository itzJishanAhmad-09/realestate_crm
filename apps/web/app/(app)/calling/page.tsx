import { createServerClient } from '@/lib/supabase/server';
import { CallingWorkspace } from '@/components/calling/CallingWorkspace';
import { redirect } from 'next/navigation';

export default async function CallingPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: dispositions } = await supabase.from('dispositions').select('id, code, label, requires_notes').eq('is_active', true).order('sort_order');
  const { data: profile } = await supabase.from('users').select('phone').eq('id', user.id).single();
    
  return <CallingWorkspace dispositions={dispositions ?? []} agentPhone={profile?.phone ?? ''} />;
}