import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { phone, reason, leadId } = await req.json();
  const normalized = normalizePhone(phone);
  if (!normalized) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  await supabase.from('dnc_numbers').upsert(
    { company_id: profile!.company_id, phone: normalized, reason, added_by: user.id },
    { onConflict: 'company_id,phone' },
  );
  if (leadId) await supabase.from('leads').update({ is_dnc: true }).eq('id', leadId);
  return NextResponse.json({ ok: true });
}
