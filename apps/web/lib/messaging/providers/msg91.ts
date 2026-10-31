import type { MessagingProvider, WhatsAppSendInput, SmsSendInput } from '../index';

interface Creds { authKey: string; senderId: string; }

export class Msg91Provider implements MessagingProvider {
  readonly name = 'msg91';
  constructor(private readonly creds: Creds) {}

  async sendWhatsApp(_input: WhatsAppSendInput): Promise<{ messageId: string }> {
    throw new Error('MSG91 WhatsApp not implemented — use meta_cloud');
  }

  async sendSms(input: SmsSendInput): Promise<{ messageId: string }> {
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { authkey: this.creds.authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: this.creds.senderId,
        mobiles: input.to.replace(/^\+/, ''),
        message: input.body,
      }),
    });
    if (!res.ok) throw new Error(`MSG91: ${await res.text()}`);
    const json = (await res.json()) as { request_id?: string; message?: string };
    return { messageId: json.request_id ?? '' };
  }
}
