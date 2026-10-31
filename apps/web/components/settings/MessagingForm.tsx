'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function MessagingForm({ configs, appUrl }: { configs: any[]; appUrl: string }) {
  const router = useRouter();
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [provider, setProvider] = useState('meta_cloud');
  const [senderId, setSenderId] = useState('');
  const [creds, setCreds] = useState('{\n  "accessToken": "",\n  "phoneNumberId": ""\n}');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const credentials = JSON.parse(creds);
      const res = await fetch('/api/messaging/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, provider, senderId: senderId || undefined, credentials }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'save_failed');
      toast.success('Saved');
      router.refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle className="text-base">Add / update provider</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta_cloud">Meta Cloud API</SelectItem>
                  <SelectItem value="msg91">MSG91 (SMS)</SelectItem>
                  <SelectItem value="gupshup">Gupshup</SelectItem>
                  <SelectItem value="interakt">Interakt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Sender ID / Phone number ID</Label>
            <Input value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="e.g. 109876543210" />
          </div>
          <div>
            <Label>Credentials (JSON)</Label>
            <textarea value={creds} onChange={(e) => setCreds(e.target.value)} rows={5}
                      className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs" />
          </div>
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </CardContent>
      </Card>

      {configs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Active configs</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {configs.map((c) => (
              <div key={c.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{c.channel} · {c.provider}</p>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {appUrl}/api/webhooks/whatsapp/{c.provider}/{c.webhook_token}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
