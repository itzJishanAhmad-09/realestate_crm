import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { reportFunnel, reportSources, reportAgents, reportProjects } from '@/lib/reports';
import { toCsv, csvResponse } from '@/lib/exports/csv';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const type   = req.nextUrl.searchParams.get('type') ?? 'funnel';
  const from   = req.nextUrl.searchParams.get('from') ?? undefined;
  const to     = req.nextUrl.searchParams.get('to')   ?? undefined;
  const range  = { from, to };

  try {
    let rows: Record<string, unknown>[] = [];
    if (type === 'funnel') {
      const f = await reportFunnel(supabase, range) as Record<string, unknown>;
      rows = Object.entries(f ?? {}).map(([stage, count]) => ({ stage, count }));
    } else if (type === 'sources') {
      rows = await reportSources(supabase, range) as any[];
    } else if (type === 'agents') {
      rows = await reportAgents(supabase, range) as any[];
    } else if (type === 'projects') {
      rows = await reportProjects(supabase, range) as any[];
    } else {
      return NextResponse.json({ error: 'unknown_type' }, { status: 400 });
    }
    const csv = toCsv(rows);
    return csvResponse(csv, `${type}-${new Date().toISOString().slice(0, 10)}.csv`);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
