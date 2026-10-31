import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processAutomationQueue } from '@/lib/automations/engine';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('user-agent') === 'vercel-cron/1.0' && !!req.headers.get('x-vercel-cron');
  const isManual = req.headers.get('x-cron-secret') === process.env.CRON_SECRET;
  if (!isVercelCron && !isManual) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const result = await processAutomationQueue(admin);
  return NextResponse.json(result);
}
