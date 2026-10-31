import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const entityType = req.nextUrl.searchParams.get('entity_type');
  const entityId   = req.nextUrl.searchParams.get('entity_id');
  let q = supabase.from('audit_log')
    .select('id, action, entity_type, entity_id, actor_id, created_at, users(name)')
    .order('created_at', { ascending: false }).limit(200);
  if (entityType) q = q.eq('entity_type', entityType);
  if (entityId)   q = q.eq('entity_id', entityId);
  const { data } = await q;
  return NextResponse.json(data ?? []);
}
