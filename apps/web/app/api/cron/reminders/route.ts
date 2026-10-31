import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMessagingProvider } from '@/lib/messaging';
import { normalizePhone } from '@/lib/phone';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const isVercelCron =
    req.headers.get('user-agent') === 'vercel-cron/1.0' && !!req.headers.get('x-vercel-cron');
  const isManual = req.headers.get('x-cron-secret') === process.env.CRON_SECRET;
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const provider = getMessagingProvider();

  const { data: due } = await admin
    .from('reminders')
    .select('id, company_id, entity_id, entity_type, channel, payload, attempts')
    .eq('status', 'pending').lte('send_at', new Date().toISOString())
    .lt('attempts', 5).order('send_at').limit(200);

  let sent = 0, failed = 0;
  for (const r of due ?? []) {
    try {
      if (r.entity_type === 'site_visit') {
        const { data: visit } = await admin
          .from('site_visits')
          .select('id, scheduled_for, project_id, leads!inner(phone, name), projects!inner(name)')
          .eq('id', r.entity_id).single();
        const phone = normalizePhone((visit as any)?.leads?.phone);
        if (!phone) throw new Error('invalid_lead_phone');
        const kind = (r.payload as { kind?: string }).kind ?? 'confirmation';
        const template =
          kind === 'reminder_1d' ? 'site_visit_reminder_1d'
          : kind === 'reminder_2h' ? 'site_visit_reminder_2h'
          : 'site_visit_confirmation';
        await provider.sendWhatsApp({
          to: phone,
          templateName: template,
          languageCode: 'en',
          parameters: [
            (visit as any)?.leads?.name ?? 'Customer',
            (visit as any)?.projects?.name ?? '',
            new Date((visit as any)?.scheduled_for).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          ],
        });
      }
      await admin.from('reminders').update({
        status: 'sent', sent_at: new Date().toISOString(), attempts: r.attempts + 1,
      }).eq('id', r.id);
      sent++;
    } catch (err) {
      await admin.from('reminders').update({
        attempts: r.attempts + 1, last_error: (err as Error).message,
        status: r.attempts + 1 >= 5 ? 'failed' : 'pending',
      }).eq('id', r.id);
      failed++;
    }
  }
  return NextResponse.json({ processed: due?.length ?? 0, sent, failed });
}
