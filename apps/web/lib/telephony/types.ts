export type CallDirection = 'outbound' | 'inbound';
export type CallStatus =
  | 'initiated' | 'ringing' | 'in_progress' | 'completed'
  | 'failed' | 'no_answer' | 'busy' | 'canceled';

export interface ClickToCallInput {
  agentPhone: string;
  customerPhone: string;
  callerId: string;
  callId: string;
  statusCallbackUrl: string;
  recordingCallbackUrl: string;
}

export interface ClickToCallResult {
  providerCallId: string;
  raw?: unknown;
}

export interface NormalizedCallEvent {
  providerCallId: string;
  direction: CallDirection;
  status: CallStatus;
  fromNumber?: string;
  toNumber?: string;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSec?: number;
  recordingUrl?: string;
  raw: unknown;
}

export interface WebhookRequest {
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, string>;
}

export interface TelephonyProvider {
  readonly name: string;
  clickToCall(input: ClickToCallInput): Promise<ClickToCallResult>;
  parseWebhook(req: WebhookRequest): NormalizedCallEvent | null;
  verifyWebhook?(req: WebhookRequest): void;
}
