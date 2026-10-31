import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function InboxPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const threads = [
    { id: '1', name: 'Amit Verma', preview: 'Can you share the 3 BHK floor plan?', active: true },
    { id: '2', name: 'Neha Gupta', preview: 'Confirmed for 11:15', active: false },
    { id: '3', name: 'Sandeep Yadav', preview: 'What is the plot rate?', active: false },
    { id: '4', name: 'Imran Khan', preview: 'Thanks, will visit Saturday', active: false },
  ];

  return (
    <div className="h-[calc(100vh-2rem)] flex overflow-hidden p-6 md:p-8">
      <div className="flex w-full h-full rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Left Sidebar (Threads) */}
        <div className="w-80 border-r border-gray-100 flex flex-col bg-[#FDFBF7]">
          <div className="p-6 border-b border-gray-100">
            <h1 className="font-serif text-3xl text-gray-900">Inbox</h1>
            <p className="text-xs text-gray-500 mt-1">WhatsApp conversations · Sample data</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map((t) => (
              <div key={t.id} className={`p-4 border-b border-gray-50 cursor-pointer ${t.active ? 'bg-white border-l-4 border-l-[#A42A22]' : 'hover:bg-white'}`}>
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 truncate mt-1">{t.preview}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Center (Chat) */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Amit Verma</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FDFBF7]">
            <div className="max-w-md rounded-lg rounded-tl-none bg-white p-3 text-sm text-gray-800 shadow-sm border border-gray-100">
              Hi, I saw the Sector 141 project. Can you share the 3 BHK floor plan?
            </div>
            <div className="max-w-md rounded-lg rounded-tr-none bg-[#A42A22] p-3 text-sm text-white shadow-sm ml-auto">
              Sure Amit, sending the brochure now. Is a site visit this weekend convenient?
            </div>
            <div className="max-w-md rounded-lg rounded-tl-none bg-white p-3 text-sm text-gray-800 shadow-sm border border-gray-100">
              Saturday works.
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <input type="text" placeholder="Type a reply" className="flex-1 rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-[#A42A22] focus:outline-none" />
              <button className="rounded-md bg-[#C02B2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A42A22]">Send</button>
              <button className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Attach brochure</button>
            </div>
          </div>
        </div>

        {/* Right Sidebar (Details) */}
        <div className="w-72 border-l border-gray-100 p-6 bg-white hidden lg:block">
          <h3 className="font-serif text-xl text-gray-900 mb-6">Lead</h3>
          <div className="space-y-5 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Stage</p>
              <span className="inline-flex items-center rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[11px] font-medium text-[#2E7D32]">Interested</span>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Interest</p>
              <p className="font-medium text-gray-900">Sector 141 · 3 BHK</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Assigned to</p>
              <p className="font-medium text-gray-900">Anil</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}