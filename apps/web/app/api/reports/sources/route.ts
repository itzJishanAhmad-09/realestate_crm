import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { reportSources } from '@/lib/reports';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const from = req.nextUrl.searchParams.get('from') ?? undefined;
  const to   = req.nextUrl.searchParams.get('to')   ?? undefined;
  try {
    const data = await reportSources(supabase, { from, to });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
