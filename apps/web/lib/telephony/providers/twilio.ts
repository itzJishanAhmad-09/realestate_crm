import crypto from 'node:crypto';
import type {
  ClickToCallInput, ClickToCallResult, NormalizedCallEvent,
  TelephonyProvider, WebhookRequest,
} from '../types';

interface TwilioCreds { accountSid: string; authToken: string; callerId: string; twimlUrl: string; }

const STATUS_MAP: Record<string, NormalizedCallEvent['status']> = {
  queued: 'initiated', initiated: 'initiated', ringing: 'ringing',
  'in-progress': 'in_progress', completed: 'completed',
  busy: 'busy', 'no-answer': 'no_answer', failed: 'failed', canceled: 'canceled',
};

export class TwilioProvider implements TelephonyProvider {
  readonly name = 'twilio';
  constructor(private readonly creds: TwilioCreds) {}

  async clickToCall(input: ClickToCallInput): Promise<ClickToCallResult> {
    const { accountSid, authToken, callerId, twimlUrl } = this.creds;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const body = new URLSearchParams({
      To: input.agentPhone, From: input.callerId || callerId,
      Url: `${twimlUrl}?customer=${encodeURIComponent(input.customerPhone)}&callId=${input.callId}`,
      StatusCallback: input.statusCallbackUrl,
      StatusCallbackEvent: 'initiated ringing answered completed',
      Record: 'true', RecordingStatusCallback: input.recordingCallbackUrl,
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok || !json.sid) throw new Error(`Twilio click-to-call failed: ${json.message ?? res.status}`);
    return { providerCallId: json.sid, raw: json };
  }

  verifyWebhook(req: WebhookRequest): void {
    const signature = req.headers['x-twilio-signature'];
    if (!signature) throw new Error('missing_signature');
    const data = req.url + Object.keys(req.body).sort().map((k) => k + req.body[k]).join('');
    const expected = crypto.createHmac('sha1', this.creds.authToken)
      .update(Buffer.from(data, 'utf8')).digest('base64');
    const a = Buffer.from(expected), b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('invalid_signature');
  }

  parseWebhook(req: WebhookRequest): NormalizedCallEvent | null {
    const b = req.body;
    if (!b.CallSid) return null;
    return {
      providerCallId: b.CallSid,
      direction: b.Direction === 'inbound' ? 'inbound' : 'outbound',
      status: STATUS_MAP[b.CallStatus] ?? 'in_progress',
      fromNumber: b.From, toNumber: b.To,
      durationSec: b.CallDuration ? Number(b.CallDuration) : undefined,
      recordingUrl: b.RecordingUrl || undefined, raw: b,
    };
  }
}
