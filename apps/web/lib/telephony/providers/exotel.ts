import type {
  ClickToCallInput, ClickToCallResult, NormalizedCallEvent,
  TelephonyProvider, WebhookRequest,
} from '../types';

interface ExotelCreds {
  subdomain: string; sid: string; apiKey: string; apiToken: string; callerId: string;
}

const STATUS_MAP: Record<string, NormalizedCallEvent['status']> = {
  'in-progress': 'in_progress', 'completed': 'completed', 'failed': 'failed',
  'no-answer': 'no_answer', 'busy': 'busy', 'canceled': 'canceled',
};

export class ExotelProvider implements TelephonyProvider {
  readonly name = 'exotel';
  constructor(private readonly creds: ExotelCreds) {}

  async clickToCall(input: ClickToCallInput): Promise<ClickToCallResult> {
    const { subdomain, sid, apiKey, apiToken, callerId } = this.creds;
    const url = `https://${apiKey}:${apiToken}@${subdomain}/v1/Accounts/${sid}/Calls/connect.json`;
    const form = new URLSearchParams({
      From: input.agentPhone, To: input.customerPhone,
      CallerId: input.callerId || callerId, CallType: 'trans', TimeLimit: '14400',
      StatusCallback: input.statusCallbackUrl,
      StatusCallbackContentType: 'application/json',
      CustomField: input.callId, Record: 'true',
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const json = (await res.json()) as { Call?: { Sid?: string } };
    if (!res.ok || !json.Call?.Sid) {
      throw new Error(`Exotel click-to-call failed: ${res.status} ${JSON.stringify(json)}`);
    }
    return { providerCallId: json.Call.Sid, raw: json };
  }

  parseWebhook(req: WebhookRequest): NormalizedCallEvent | null {
    const b = req.body;
    const sid = b.CallSid ?? b.Sid;
    if (!sid) return null;
    const rawStatus = (b.Status ?? '').toLowerCase();
    return {
      providerCallId: sid,
      direction: (b.Direction ?? '').toLowerCase().includes('inbound') ? 'inbound' : 'outbound',
      status: STATUS_MAP[rawStatus] ?? 'in_progress',
      fromNumber: b.From ?? b.CallFrom,
      toNumber: b.To ?? b.CallTo,
      startedAt: b.StartTime, answeredAt: b.AnsweredTime, endedAt: b.EndTime,
      durationSec: b.ConversationDuration ? Number(b.ConversationDuration) : undefined,
      recordingUrl: b.RecordingUrl || undefined, raw: b,
    };
  }
}
