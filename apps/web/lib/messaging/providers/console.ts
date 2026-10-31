import type { MessagingProvider, WhatsAppSendInput, SmsSendInput } from '../index';

export class ConsoleMessagingProvider implements MessagingProvider {
  readonly name = 'console';
  async sendWhatsApp(input: WhatsAppSendInput) {
    console.log(`[whatsapp:console] to=${input.to} template=${input.templateName}`, input.parameters);
    return { messageId: `console_${Date.now()}` };
  }
  async sendSms(input: SmsSendInput) {
    console.log(`[sms:console] to=${input.to} body=${input.body}`);
    return { messageId: `console_${Date.now()}` };
  }
}
