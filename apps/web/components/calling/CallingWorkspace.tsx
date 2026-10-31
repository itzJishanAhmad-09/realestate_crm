'use client';
import { useState } from 'react';
import Link from 'next/link';

export function CallingWorkspace({ dispositions }: { dispositions: any[]; agentPhone: string }) {
  const [callState, setCallState] = useState<'idle' | 'live' | 'wrap_up'>('live');
  const [notes, setNotes] = useState('');

  // Sample data matching the PDF
  const lead = { name: 'Amit Verma', phone: '9898765210', interest: 'Sector 141 · 3 BHK', budget: '₹1.2 Cr', source: 'Website', agent: 'Anil', stage: 'Interested' };

  if (callState === 'idle') {
    return <div className="p-8 font-serif text-2xl">Queue finished.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8 md:p-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">On call</h1>
          <p className="text-sm text-gray-500 mt-1">Sample data</p>
        </div>
        <button className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Skip lead</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Lead Info Card */}
        <div className="col-span-1 rounded-xl bg-white p-6 shadow-sm border border-gray-100 h-fit">
          <h2 className="text-xl font-serif text-gray-900">{lead.name}</h2>
          <p className="text-sm text-gray-500 font-mono mb-3">{lead.phone.replace(/(\d{2})\d{5}(\d{3})/, '$1•••••$2')}</p>
          <span className="inline-flex items-center rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[11px] font-medium text-[#2E7D32] mb-6">{lead.stage}</span>
          
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500 block text-xs">Interest</span><span className="font-medium text-gray-900">{lead.interest}</span></div>
            <div><span className="text-gray-500 block text-xs">Budget</span><span className="font-medium text-gray-900">{lead.budget}</span></div>
            <div><span className="text-gray-500 block text-xs">Source</span><span className="font-medium text-gray-900">{lead.source}</span></div>
            <div><span className="text-gray-500 block text-xs">Assigned to</span><span className="font-medium text-gray-900">{lead.agent}</span></div>
          </div>
        </div>

        {/* Center - Call Controls */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* Timer Box */}
          <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-gray-500 mb-2">Connected</p>
            <h2 className="font-serif text-6xl text-gray-900 mb-8 tracking-wider">02:14</h2>
            
            <div className="flex items-center gap-3">
              <button className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Mute</button>
              <button className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Hold</button>
              <button className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Keypad</button>
              <button onClick={() => setCallState('wrap_up')} className="rounded-full bg-[#111] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-black">End call</button>
            </div>
          </div>

          {/* Disposition Form */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="font-serif text-2xl text-gray-900 mb-4">After the call</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="rounded-lg border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50">Interested</button>
              <button className="rounded-lg border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50">Call back</button>
              <button className="rounded-lg border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50">Site visit booked</button>
              <button className="rounded-lg border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50">Not interested</button>
              <button className="rounded-lg border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50">Wrong number</button>
              <button className="rounded-lg border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50">No answer</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-medium text-gray-900 mb-1 block">Notes</label>
                <textarea className="w-full rounded-md border border-gray-200 p-3 text-sm focus:border-[#A42A22] focus:outline-none" rows={2} placeholder="What did they say?"></textarea>
              </div>
              
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-[13px] font-medium text-gray-900 mb-1 block">Next follow-up</label>
                  <input type="datetime-local" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#A42A22] focus:outline-none" />
                </div>
                <button className="rounded-md bg-[#C02B2B] px-6 py-2 text-sm font-semibold text-white hover:bg-[#A42A22]">Save and next</button>
              </div>
            </div>
          </div>
        </div>

        {/* History Card */}
        <div className="col-span-1 rounded-xl bg-white p-6 shadow-sm border border-gray-100 h-fit">
          <h2 className="font-serif text-2xl text-gray-900 mb-6">History</h2>
          <div className="space-y-5 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Today 9:10 · Call · 2 min</p>
              <p className="text-gray-900 font-medium">Asked about 3 BHK floor plans.</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Yesterday · WhatsApp sent</p>
              <p className="text-gray-900 font-medium">Brochure shared.</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Mon · Lead created</p>
              <p className="text-gray-900 font-medium">Source: Website form.</p>
            </div>
          </div>
          <button className="mt-8 w-full rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Send WhatsApp</button>
        </div>

      </div>
    </div>
  );
}