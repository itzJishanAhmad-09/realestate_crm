'use client';
import { useState } from 'react';
import Link from 'next/link';

function formatDueDate(dateString: string) {
  const d = new Date(dateString); const now = new Date(); const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}
const STAGE_COLORS: Record<string, string> = { 'Interested': 'bg-[#E8F5E9] text-[#2E7D32]', 'Site visit': 'bg-[#FFF8E1] text-[#F57F17]', 'New': 'bg-[#FFEBEE] text-[#C62828]', 'Contacted': 'bg-[#E3F2FD] text-[#1565C0]', 'Cold': 'bg-[#F5F5F5] text-[#616161]' };

export function FollowUpsClient({ followUps }: { followUps: any[] }) {
  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming'>('today');
  const now = new Date(); const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); const todayEnd = todayStart + 86400000;

  const todayTasks = followUps.filter(f => { const t = new Date(f.due_at).getTime(); return t >= todayStart && t < todayEnd; });
  const overdueTasks = followUps.filter(f => new Date(f.due_at).getTime() < todayStart);
  const upcomingTasks = followUps.filter(f => new Date(f.due_at).getTime() >= todayEnd);
  const displayData = activeTab === 'today' ? todayTasks : activeTab === 'overdue' ? overdueTasks : upcomingTasks;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div><h1 className="font-serif text-4xl text-gray-900 leading-tight">Follow-ups</h1><p className="text-sm text-gray-500 mt-1">Your scheduled tasks</p></div>
        <div className="w-32"></div> {/* Spacer for absolute modal button */}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('today')} className={`rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${activeTab === 'today' ? 'bg-[#C02B2B] text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>Today {todayTasks.length}</button>
        <button onClick={() => setActiveTab('overdue')} className={`rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${activeTab === 'overdue' ? 'bg-[#C02B2B] text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>Overdue {overdueTasks.length}</button>
        <button onClick={() => setActiveTab('upcoming')} className={`rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${activeTab === 'upcoming' ? 'bg-[#C02B2B] text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>Upcoming {upcomingTasks.length}</button>
      </div>
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead><tr className="border-b border-gray-100 bg-white"><th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Lead</th><th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Task</th><th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Due</th><th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Agent</th><th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Stage</th><th className="px-6 py-4"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {displayData.map((row: any) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900"><Link href={`/leads/${row.lead_id}`} className="hover:underline">{row.leads?.name || 'Unknown Lead'}</Link></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.note || (row.channel === 'call' ? 'Call back' : row.channel) || 'Follow up'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{formatDueDate(row.due_at)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.users?.full_name || 'Unassigned'}</td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STAGE_COLORS[row.leads?.lead_statuses?.label] || 'bg-gray-100 text-gray-700'}`}>{row.leads?.lead_statuses?.label || 'New'}</span></td>
                  <td className="px-6 py-4 text-right"><button className="rounded-md border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">Mark done</button></td>
                </tr>
              ))}
              {displayData.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-500">No {activeTab} follow-ups found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}