import { createServerClient } from '@/lib/supabase/server';
import { MessagingForm } from '@/components/settings/MessagingForm';

export default async function MessagingSettingsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user!.id).single();
  const { data: configs } = await supabase.from('messaging_configs')
    .select('id, channel, provider, sender_id, webhook_token, is_active')
    .eq('company_id', profile!.company_id);
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">Messaging settings</h1>
      <MessagingForm configs={configs ?? []} appUrl={process.env.APP_URL ?? 'http://localhost:3000'} />
    </div>
  );
}
