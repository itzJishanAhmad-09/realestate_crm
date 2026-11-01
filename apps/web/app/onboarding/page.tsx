import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.company_id) redirect('/dashboard');

  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="font-serif text-3xl text-gray-900">Almost there</h1>
      <p className="mt-2 text-sm text-gray-600">
        Your account isn&apos;t linked to a company yet. Contact{' '}
        <a href="mailto:support@yourcrm.com" className="text-[#A42A22] underline">
          support@yourcrm.com
        </a>{' '}
        and we&apos;ll set it up.
      </p>
    </div>
  );
}
