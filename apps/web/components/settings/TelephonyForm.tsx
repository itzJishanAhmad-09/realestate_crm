'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export function TelephonyForm({ existing, appUrl }: { existing: any | null; appUrl: string }) {
  const router = useRouter();
  const [provider, setProvider] = useState(existing?.provider ?? 'exotel');
  const [callerId, setCallerId] = useState(existing?.caller_id ?? '');
  const [creds, setCreds] = useState('{\n  "subdomain": "api.exotel.com",\n  "sid": "",\n  "apiKey": "",\n  "apiToken": ""\n}');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const credentials = JSON.parse(creds);
      const res = await fetch('/api/settings/telephony', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, callerId, credentials }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'save_failed');
      toast.success('Saved');
      router.refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const webhookUrl = existing?.webhook_token
    ? `${appUrl}/api/webhooks/telephony/${existing.provider}/${existing.webhook_token}`
    : 'Save once to generate a webhook URL';

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div>
          <Label>Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="exotel">Exotel</SelectItem>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="knowlarity">Knowlarity</SelectItem>
              <SelectItem value="myoperator">MyOperator</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Caller ID (ExoPhone / Twilio number)</Label>
          <Input value={callerId} onChange={(e) => setCallerId(e.target.value)} placeholder="+911234567890" />
        </div>
        <div>
          <Label>Credentials (JSON)</Label>
          <textarea value={creds} onChange={(e) => setCreds(e.target.value)} rows={6}
                    className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs" />
        </div>
        <Button onClick={save} disabled={busy || !callerId}>{busy ? 'Saving…' : 'Save'}</Button>

        <div className="rounded-md border bg-secondary/40 p-3 text-xs">
          <p className="font-medium">Webhook URL</p>
          <p className="mt-1 break-all font-mono">{webhookUrl}</p>
          <p className="mt-1 text-muted-foreground">Paste this into your provider's dashboard as the StatusCallback URL.</p>
        </div>
      </CardContent>
    </Card>
  );
}
