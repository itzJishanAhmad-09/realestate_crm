import type { MessagingProvider, WhatsAppSendInput, SmsSendInput } from '../index';

interface Creds { accessToken: string; phoneNumberId: string; }

export class MetaCloudProvider implements MessagingProvider {
  readonly name = 'meta_cloud';
  constructor(private readonly creds: Creds) {}

  async sendWhatsApp(input: WhatsAppSendInput): Promise<{ messageId: string }> {
    const url = `https://graph.facebook.com/v20.0/${this.creds.phoneNumberId}/messages`;
    const components = input.parameters.length
      ? [{ type: 'body', parameters: input.parameters.map((text) => ({ type: 'text', text })) }]
      : undefined;
    const body = {
      messaging_product: 'whatsapp',
      to: input.to.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        ...(components ? { components } : {}),
      },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.creds.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { messages?: { id?: string }[]; error?: { message: string } };
    if (!res.ok) throw new Error(`Meta Cloud: ${json.error?.message ?? JSON.stringify(json)}`);
    return { messageId: json.messages?.[0]?.id ?? '' };
  }

  async sendSms(_input: SmsSendInput): Promise<{ messageId: string }> {
    throw new Error('Meta Cloud does not send SMS');
  }
}
