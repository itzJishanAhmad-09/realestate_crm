import type { SupabaseClient } from '@supabase/supabase-js';
import { buildMessagingProvider, getMessagingProvider } from '@/lib/messaging';
import { normalizePhone } from '@/lib/phone';

export interface AutomationRow {
  id: string;
  company_id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  action_type: string;
  action_config: any;
}

export async function runAutomation(
  admin: SupabaseClient,
  auto: AutomationRow,
  event: { trigger_type: string; entity_type: string; entity_id: string; payload: any },
): Promise<Record<string, unknown>> {
  const cfg = auto.action_config ?? {};

  switch (auto.action_type) {
    case 'send_wa_template': {
      const { data: lead } = await admin
        .from('leads')
        .select('name, phone')
        .eq('id', event.entity_id)
        .eq('company_id', auto.company_id)
        .single();
      if (!lead) throw new Error('lead_not_found');
      const phone = normalizePhone(lead.phone);
      if (!phone) throw new Error('invalid_phone');

      const params = (cfg.parameters ?? []).map((p: string) =>
        p === 'name' ? lead.name : p === 'phone' ? lead.phone : String(p),
      );

      const { data: mcfg } = await admin
        .from('messaging_configs')
        .select('*')
        .eq('company_id', auto.company_id)
        .eq('channel', 'whatsapp')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!mcfg && process.env.NODE_ENV === 'production') {
        throw new Error('whatsapp_not_configured');
      }

      const provider = mcfg ? buildMessagingProvider(mcfg as any) : getMessagingProvider();
      const result = await provider.sendWhatsApp({
        to: phone,
        templateName: cfg.template_name ?? 'hello_world',
        languageCode: cfg.language_code ?? 'en',
        parameters: params,
      });

      await admin.from('messages').insert({
        company_id: auto.company_id,
        lead_id: event.entity_id,
        channel: 'whatsapp',
        direction: 'outbound',
        to_number: phone,
        provider: provider.name,
        provider_message_id: result.messageId,
        status: 'sent',
      });
      return { messageId: result.messageId };
    }

    case 'create_followup': {
      const minutes = Number(cfg.minutes_from_now ?? 60);

      let assignedTo: string | null = cfg.assigned_to ?? null;
      if (assignedTo) {
        const { data: u } = await admin
          .from('users')
          .select('id')
          .eq('id', assignedTo)
          .eq('company_id', auto.company_id)
          .maybeSingle();
        if (!u) assignedTo = null;
      }

      const { data, error } = await admin
        .from('follow_ups')
        .insert({
          company_id: auto.company_id,
          lead_id: event.entity_id,
          assignee_id: assignedTo,
          due_at: new Date(Date.now() + minutes * 60_000).toISOString(),
          channel: cfg.channel ?? 'call',
          note: cfg.notes ?? `Auto: ${auto.name}`,
          created_by: null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return { followupId: data?.id };
    }

    default:
      throw new Error(`action_not_implemented: ${auto.action_type}`);
  }
}

export async function processAutomationQueue(
  admin: SupabaseClient,
  limit = 50,
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const { data: events } = await admin
    .from('automation_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at')
    .limit(limit);

  let succeeded = 0, failed = 0;

  for (const ev of events ?? []) {
    await admin
      .from('automation_queue')
      .update({ status: 'processing', attempts: ev.attempts + 1 })
      .eq('id', ev.id);

    const { data: autos } = await admin
      .from('automations')
      .select('*')
      .eq('company_id', ev.company_id)
      .eq('trigger_type', ev.trigger_type)
      .eq('is_active', true)
      .order('order_index');

    let ok = true;

    for (const auto of autos ?? []) {
      const { data: run } = await admin
        .from('automation_runs')
        .insert({
          automation_id: auto.id,
          company_id: ev.company_id,
          entity_type: ev.entity_type,
          entity_id: ev.entity_id,
          status: 'running',
        })
        .select('id')
        .single();

      if (!run?.id) {
        ok = false;
        continue;
      }

      try {
        const result = await runAutomation(admin, auto as any, ev);
        await admin
          .from('automation_runs')
          .update({ status: 'succeeded', action_result: result, completed_at: new Date().toISOString() })
          .eq('id', run.id);
      } catch (err) {
        ok = false;
        await admin
          .from('automation_runs')
          .update({
            status: 'failed',
            error: (err as Error).message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', run.id);
      }
    }

    await admin
      .from('automation_queue')
      .update({ status: ok ? 'done' : 'failed', processed_at: new Date().toISOString() })
      .eq('id', ev.id);

    ok ? succeeded++ : failed++;
  }

  return { processed: events?.length ?? 0, succeeded, failed };
}
