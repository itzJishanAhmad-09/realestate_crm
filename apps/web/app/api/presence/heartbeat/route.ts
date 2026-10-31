import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const status = ['online','on_call','wrapping','idle','offline'].includes(body.status) ? body.status : 'online';
  const callId = body.currentCallId ?? null;

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { error } = await supabase.from('user_presence').upsert({
    user_id: user.id, 
    company_id: profile!.company_id,
    last_seen_at: new Date().toISOString(),
    current_call_id: callId, 
    status,
  }, { onConflict: 'user_id' });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}