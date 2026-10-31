import { createServerClient } from '@/lib/supabase/server';
import { TelephonyForm } from '@/components/settings/TelephonyForm';

export default async function TelephonySettingsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user!.id).single();
  const { data: config } = await supabase.from('telephony_configs')
    .select('id, provider, caller_id, webhook_token, is_active')
    .eq('company_id', profile!.company_id).eq('is_active', true).maybeSingle();
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">Telephony settings</h1>
      <TelephonyForm existing={config} appUrl={process.env.APP_URL ?? 'http://localhost:3000'} />
    </div>
  );
}
