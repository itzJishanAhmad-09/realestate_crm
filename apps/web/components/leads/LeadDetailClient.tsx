'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Phone, MessageCircle, MapPin, FileText, Clock, ArrowLeft, Send, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDateTime, formatDate, relativeTime } from '@/lib/utils';

type Tab = 'timeline' | 'calls' | 'visits' | 'messages' | 'docs';

export function LeadDetailClient({
  lead, notes, calls, visits, messages, docs, dispositions, projects, statuses, userRole, userPhone,
}: any) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>('timeline');
  const [noteText, setNoteText] = useState('');
  const [addNoteBusy, setAddNoteBusy] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);

  async function addNote() {
    if (!noteText.trim()) return;
    setAddNoteBusy(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: noteText }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'save_failed');
      setNoteText('');
      startTransition(() => router.refresh());
    } catch (e) { toast.error((e as Error).message); }
    finally { setAddNoteBusy(false); }
  }

  const initials = String(lead.name ?? '?').split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase();
  const tabs: [Tab, string, number][] = [
    ['timeline', 'Timeline', notes.length],
    ['calls', 'Calls', calls.length],
    ['visits', 'Site visits', visits.length],
    ['messages', 'Messages', messages.length],
    ['docs', 'Documents', docs.length],
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link href="/leads"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-xl font-semibold">Lead</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: profile + quick actions */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{lead.name}</p>
                <p className="truncate text-sm text-muted-foreground">{lead.phone}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setCallOpen(true)}>
                <Phone className="mr-1 h-3.5 w-3.5" /> Call
              </Button>
              <Button size="sm" variant="outline" onClick={() => setWaOpen(true)}>
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
              </Button>
              <Button size="sm" variant="outline" onClick={() => setVisitOpen(true)}>
                <MapPin className="mr-1 h-3.5 w-3.5" /> Site visit
              </Button>
            </div>

            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Status"><Badge variant="outline">{lead.lead_statuses?.label ?? 'New'}</Badge></Field>
              <Field label="Source">{lead.lead_sources?.name ?? '—'}</Field>
              <Field label="Project">{lead.projects?.name ?? '—'}</Field>
              <Field label="Assigned">{lead.users?.name ?? 'Unassigned'}</Field>
              <Field label="Budget">
                {lead.budget_min && lead.budget_max
                  ? `₹${(lead.budget_min/100000).toFixed(0)}–${(lead.budget_max/100000).toFixed(0)}L`
                  : '—'}
              </Field>
              <Field label="Purpose">{lead.purpose ?? '—'}</Field>
              <Field label="Email">{lead.email ?? '—'}</Field>
              <Field label="Last contact">
                {lead.last_contacted_at ? relativeTime(lead.last_contacted_at) : '—'}
              </Field>
            </dl>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={lead.status_id ?? ''}
                      onValueChange={async (v) => {
                        await fetch(`/api/leads/${lead.id}/status`, {
                          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ statusId: v }),
                        });
                        toast.success('Status updated');
                        startTransition(() => router.refresh());
                      }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Change status…" /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Right: timeline / calls / visits */}
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note…"
                  className="min-h-[60px] flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={addNote} disabled={!noteText.trim() || addNoteBusy}>
                  {addNoteBusy ? 'Saving…' : 'Save note'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-1 border-b overflow-x-auto">
            {tabs.map(([k, label, count]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`border-b-2 px-3 py-2 text-sm ${tab === k ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'}`}>
                {label} <span className="text-xs text-muted-foreground">({count})</span>
              </button>
            ))}
          </div>

          {tab === 'timeline' && (
            <div className="space-y-2">
              {notes.map((n: any) => (
                <div key={n.id} className="rounded-md border p-3 text-sm">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.users?.name ?? 'System'} · {relativeTime(n.created_at)}
                  </p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            </div>
          )}

          {tab === 'calls' && (
            <div className="space-y-2">
              {calls.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">{c.direction} · {c.status}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(c.started_at)}</p>
                  </div>
                  <div className="text-right text-xs">
                    {c.talk_time_sec != null && <p>{c.talk_time_sec}s talk time</p>}
                    {c.recording_url && <a className="text-primary underline" href={c.recording_url} target="_blank" rel="noreferrer">recording</a>}
                  </div>
                </div>
              ))}
              {calls.length === 0 && <p className="text-sm text-muted-foreground">No calls yet.</p>}
            </div>
          )}

          {tab === 'visits' && (
            <div className="space-y-2">
              {visits.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">{v.projects?.name ?? 'Visit'}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(v.scheduled_for)}</p>
                  </div>
                  <Badge variant="outline">{v.status}</Badge>
                </div>
              ))}
              {visits.length === 0 && <p className="text-sm text-muted-foreground">No site visits yet.</p>}
            </div>
          )}

          {tab === 'messages' && (
            <div className="space-y-2">
              {messages.map((m: any) => (
                <div key={m.id} className={`rounded-md border p-3 text-sm ${m.direction === 'outbound' ? 'bg-secondary/40' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{m.channel} · {m.direction}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(m.created_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{m.body ?? '—'}</p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
            </div>
          )}

          {tab === 'docs' && (
            <div className="space-y-2">
              <DocumentUploader leadId={lead.id} onUploaded={() => startTransition(() => router.refresh())} />
              {docs.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground">{d.doc_type} · {formatDate(d.created_at)}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">Open</a>
                  </Button>
                </div>
              ))}
              {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Call modal — reuses Phase 2 click-to-call */}
      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Call {lead.name}</DialogTitle></DialogHeader>
          <CallModal leadId={lead.id} defaultAgentPhone={userPhone}
                     onDone={() => { setCallOpen(false); startTransition(() => router.refresh()); }} />
        </DialogContent>
      </Dialog>

      {/* Site visit modal */}
      <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book site visit</DialogTitle></DialogHeader>
          <SiteVisitModal leadId={lead.id} projects={projects}
                          onDone={() => { setVisitOpen(false); startTransition(() => router.refresh()); }} />
        </DialogContent>
      </Dialog>

      {/* WhatsApp send modal */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send WhatsApp</DialogTitle></DialogHeader>
          <WhatsAppModal leadId={lead.id}
                         onDone={() => { setWaOpen(false); startTransition(() => router.refresh()); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function CallModal({ leadId, defaultAgentPhone, onDone }: { leadId: string; defaultAgentPhone: string; onDone: () => void }) {
  const [agentPhone, setAgentPhone] = useState(defaultAgentPhone);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function call() {
    setErr(null); setBusy(true);
    try {
      const res = await fetch('/api/calls/click-to-call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, agentPhone }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'call_failed');
      toast.success('Dialling your phone…');
      onDone();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Your phone will ring first, then connect to the lead.</p>
      <Input value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} placeholder="Your mobile (10-digit)" />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button onClick={call} disabled={busy || !agentPhone}>{busy ? 'Dialling…' : 'Call now'}</Button>
    </div>
  );
}

function SiteVisitModal({ leadId, projects, onDone }: { leadId: string; projects: any[]; onDone: () => void }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [when, setWhen] = useState('');
  const [pickup, setPickup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null); setBusy(true);
    try {
      const res = await fetch('/api/site-visits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId, projectId,
          scheduledFor: new Date(when).toISOString(),
          pickupRequired: pickup,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'book_failed');
      toast.success('Visit booked');
      onDone();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Project</label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
          <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Date & time</label>
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
        Pickup required
      </label>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button onClick={submit} disabled={busy || !when || !projectId}>{busy ? 'Booking…' : 'Book visit'}</Button>
    </div>
  );
}

function WhatsAppModal({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setErr(null); setBusy(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, channel: 'whatsapp', body }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'send_failed');
      toast.success('Message sent');
      onDone();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <textarea value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="Message…" rows={4}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button onClick={send} disabled={busy || !body.trim()}>
        {busy ? 'Sending…' : <><Send className="mr-1 h-3.5 w-3.5" />Send</>}
      </Button>
    </div>
  );
}

function DocumentUploader({ leadId, onUploaded }: { leadId: string; onUploaded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState('pan');
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.append('file', file);
    form.append('entity_type', 'lead');
    form.append('entity_id', leadId);
    form.append('doc_type', docType);
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? 'upload_failed');
      toast.success('Uploaded');
      onUploaded();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); e.target.value = ''; }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
      <Select value={docType} onValueChange={setDocType}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pan">PAN</SelectItem>
          <SelectItem value="aadhaar">Aadhaar</SelectItem>
          <SelectItem value="address_proof">Address proof</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <Upload className="h-3.5 w-3.5" />
        {busy ? 'Uploading…' : 'Upload file'}
        <input type="file" className="hidden" onChange={upload} disabled={busy} />
      </label>
    </div>
  );
}
