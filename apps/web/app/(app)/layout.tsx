import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { PresenceBeacon } from '@/components/presence/PresenceBeacon';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('full_name, role, company_id, companies(name)').eq('id', user.id).single();
  const companyName = (profile as any)?.companies?.name ?? '[CRM name]';

  return (
    <div className="flex h-screen w-full bg-[#FDFBF7] overflow-hidden">
      <aside className="hidden w-60 shrink-0 md:block h-full">
        <Sidebar companyName={companyName} />
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <PresenceBeacon />
      <CommandPalette />
    </div>
  );
}