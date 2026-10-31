'use client';
import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function InboxThreadClient({ leadId, initial }: { leadId: string; initial: any[] }) {
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, channel, body }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'send_failed');
      setMessages((m) => [...m, {
        id: crypto.randomUUID(), channel, direction: 'outbound', body,
        created_at: new Date().toISOString(),
      }]);
      setBody('');
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {messages.map((m: any) => {
          const out = m.direction === 'outbound';
          return (
            <div key={m.id} className={out ? 'text-right' : 'text-left'}>
              <div className={`inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm ${out ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {m.body || `[${m.channel}]`}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {m.channel} · {new Date(m.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet — start the conversation below.</p>}
      </div>

      <div className="flex items-center gap-2 border-t pt-3">
        <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
        />
        <Button onClick={send} disabled={busy || !body.trim()}>
          {busy ? '…' : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
