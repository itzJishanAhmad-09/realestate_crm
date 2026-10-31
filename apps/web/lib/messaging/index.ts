export interface WhatsAppSendInput {
  to: string;
  templateName: string;
  languageCode: string;
  parameters: string[];
}

export interface SmsSendInput {
  to: string;
  body: string;
}

export interface MessagingProvider {
  readonly name: string;
  sendWhatsApp(input: WhatsAppSendInput): Promise<{ messageId: string }>;
  sendSms(input: SmsSendInput): Promise<{ messageId: string }>;
}

import { ConsoleMessagingProvider } from './providers/console';
import { MetaCloudProvider } from './providers/meta_cloud';
import { Msg91Provider } from './providers/msg91';
import { decryptJson } from '@/lib/telephony/crypto';

export { ConsoleMessagingProvider, MetaCloudProvider, Msg91Provider };

export interface MessagingConfigRow {
  id: string;
  company_id: string;
  channel: 'whatsapp' | 'sms';
  provider: 'meta_cloud' | 'gupshup' | 'interakt' | 'msg91' | 'karix' | 'twilio';
  credentials_enc: string;
  sender_id: string | null;
}

export function buildMessagingProvider(cfg: MessagingConfigRow): MessagingProvider {
  const creds = decryptJson(cfg.credentials_enc);
  if (cfg.provider === 'meta_cloud') {
    return new MetaCloudProvider({
      accessToken: creds.accessToken,
      phoneNumberId: cfg.sender_id ?? creds.phoneNumberId,
    });
  }
  if (cfg.provider === 'msg91') {
    return new Msg91Provider({
      authKey: creds.authKey,
      senderId: cfg.sender_id ?? creds.senderId,
    });
  }
  throw new Error(`Messaging provider "${cfg.provider}" not implemented yet`);
}

/** Console fallback — used when no company config exists (dev). */
export function getMessagingProvider(): MessagingProvider {
  return new ConsoleMessagingProvider();
}
