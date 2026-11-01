import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewProjectModal } from '@/components/projects/NewProjectModal';

export default async function ProjectsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) redirect('/login');
  
  const { data: projects } = await supabase.from('projects').select('*').eq('company_id', profile.company_id).order('name');

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Your active inventory</p>
        </div>
        <NewProjectModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(projects ?? []).map((p: any) => (
          <div key={p.id} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col h-44">
            <h2 className="font-serif text-xl text-gray-900 mb-1">{p.name}</h2>
            <p className="text-[13px] text-gray-500 mb-4">{p.locality ? `${p.locality} · ` : ''}{p.city || 'Location'}</p>
            
            <div className="mt-auto">
              <p className="text-[13px] text-gray-600 mb-2">Status: {p.status || 'Active'}</p>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[11px] font-medium text-[#2E7D32]">Active</span>
              </div>
            </div>
          </div>
        ))}
        {(projects ?? []).length === 0 && (
           <div className="col-span-full rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-500">
             No projects yet. Click "+ New Project" to create one.
           </div>
        )}
      </div>
    </div>
  );
}