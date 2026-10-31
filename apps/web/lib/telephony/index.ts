import { decryptJson } from './crypto';
import { ExotelProvider } from './providers/exotel';
import { TwilioProvider } from './providers/twilio';
import type { TelephonyProvider } from './types';

export * from './types';

export interface TelephonyConfigRow {
  id: string; company_id: string;
  provider: 'exotel' | 'knowlarity' | 'myoperator' | 'twilio';
  credentials_enc: string; caller_id: string | null;
  webhook_token: string; settings: Record<string, unknown>;
}

export function buildProvider(cfg: TelephonyConfigRow): TelephonyProvider {
  const creds = decryptJson(cfg.credentials_enc);
  switch (cfg.provider) {
    case 'exotel':
      return new ExotelProvider({
        subdomain: creds.subdomain, sid: creds.sid,
        apiKey: creds.apiKey, apiToken: creds.apiToken,
        callerId: cfg.caller_id ?? creds.callerId,
      });
    case 'twilio':
      return new TwilioProvider({
        accountSid: creds.accountSid, authToken: creds.authToken,
        callerId: cfg.caller_id ?? creds.callerId,
        twimlUrl: `${process.env.APP_URL}/api/telephony/twiml/dial`,
      });
    default:
      throw new Error(`Provider "${cfg.provider}" is not implemented yet`);
  }
}
