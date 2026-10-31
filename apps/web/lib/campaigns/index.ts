import type { SupabaseClient } from '@supabase/supabase-js';
import { buildMessagingProvider, getMessagingProvider } from '@/lib/messaging';
import { normalizePhone } from '@/lib/phone';

export interface SendCampaignResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

export async function sendCampaign(admin: SupabaseClient, campaignId: string): Promise<SendCampaignResult> {
  const { data: campaign, error } = await admin
    .from('campaigns').select('*, wa_templates(*), sms_templates(*)')
    .eq('id', campaignId).single();
  if (error || !campaign) throw new Error(`campaign_not_found: ${error?.message}`);

  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new Error(`campaign_not_sendable: status=${campaign.status}`);
  }

  const { data: cfg } = await admin.from('messaging_configs').select('*')
    .eq('company_id', campaign.company_id).eq('channel', campaign.channel)
    .eq('is_active', true).limit(1).maybeSingle();

  const provider = cfg ? buildMessagingProvider(cfg as any) : getMessagingProvider();

  await admin.from('campaigns').update({
    status: 'running', started_at: new Date().toISOString(),
  }).eq('id', campaignId);

  const { data: recipients } = await admin.from('campaign_recipients')
    .select('id, lead_id, phone').eq('campaign_id', campaignId).eq('status', 'pending');

  let sent = 0, failed = 0, skipped = 0;

  for (const r of recipients ?? []) {
    const phone = normalizePhone(r.phone);
    if (!phone) {
      await admin.from('campaign_recipients').update({ status: 'skipped', error: 'invalid_phone' }).eq('id', r.id);
      skipped++;
      continue;
    }
    try {
      let messageId = '';
      if (campaign.channel === 'whatsapp' && campaign.wa_templates) {
        const wa = campaign.wa_templates as any;
        const variables = Array.isArray(wa.variables) ? wa.variables : [];
        const { data: lead } = await admin.from('leads').select('name, phone').eq('id', r.lead_id).single();
        const params = variables.map((v: string) =>
          v === 'name' ? (lead?.name ?? 'Customer') :
          v === 'phone' ? (lead?.phone ?? '') : String(v)
        );
        const result = await provider.sendWhatsApp({
          to: phone, templateName: wa.name,
          languageCode: wa.language_code ?? 'en', parameters: params,
        });
        messageId = result.messageId;
      } else if (campaign.channel === 'sms' && campaign.sms_templates) {
        const sms = campaign.sms_templates as any;
        const { data: lead } = await admin.from('leads').select('name').eq('id', r.lead_id).single();
        const body = String(sms.body).replace(/\{\{1\}\}/g, lead?.name ?? 'Customer');
        const result = await provider.sendSms({ to: phone, body });
        messageId = result.messageId;
      } else {
        throw new Error('missing_template');
      }

      await admin.from('campaign_recipients').update({
        status: 'sent', provider_message_id: messageId, sent_at: new Date().toISOString(),
      }).eq('id', r.id);

      await admin.from('messages').insert({
        company_id: campaign.company_id, lead_id: r.lead_id, campaign_id: campaignId,
        channel: campaign.channel, direction: 'outbound', to_number: phone,
        provider: provider.name, provider_message_id: messageId, status: 'sent',
      });
      sent++;
    } catch (err) {
      await admin.from('campaign_recipients').update({
        status: 'failed', error: (err as Error).message,
      }).eq('id', r.id);
      failed++;
    }
  }

  await admin.from('campaigns').update({
    status: 'completed', completed_at: new Date().toISOString(),
    sent_count: sent, failed_count: failed, skipped_count: skipped,
  }).eq('id', campaignId);

  return { total: recipients?.length ?? 0, sent, failed, skipped };
}
