'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

const Schema = z.object({
  fullName: z.string().min(1),
  companyName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  teamSize: z.string(),
  password: z.string().min(8),
});

export async function registerAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };

  const admin = createAdminClient();

  const { data: auth, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
    },
  });
  if (authErr || !auth.user) return { ok: false, error: authErr?.message ?? 'signup_failed' };

  const { data: company, error: coErr } = await admin
    .from('companies')
    .insert({
      name: parsed.data.companyName,
      timezone: 'Asia/Kolkata',
      calling_hours_start: '09:00',
      calling_hours_end: '21:00',
    })
    .select('id')
    .single();
  if (coErr || !company) {
    await admin.auth.admin.deleteUser(auth.user.id);
    return { ok: false, error: 'company_create_failed' };
  }

  const { error: uErr } = await admin.from('users').insert({
    id: auth.user.id,
    company_id: company.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    role: 'company_admin',
    is_active: true,
  });
  if (uErr) {
    await admin.auth.admin.deleteUser(auth.user.id);
    await admin.from('companies').delete().eq('id', company.id);
    return { ok: false, error: 'profile_create_failed' };
  }

  await admin.from('lead_statuses').insert([
    { company_id: company.id, key: 'new', label: 'New', sort_order: 1, category: 'open' },
    { company_id: company.id, key: 'contacted', label: 'Contacted', sort_order: 2, category: 'open' },
    { company_id: company.id, key: 'interested', label: 'Interested', sort_order: 3, category: 'open' },
    { company_id: company.id, key: 'visit_scheduled', label: 'Site visit scheduled', sort_order: 4, category: 'open' },
    { company_id: company.id, key: 'visited', label: 'Site visit done', sort_order: 5, category: 'open' },
    { company_id: company.id, key: 'booked', label: 'Booked', sort_order: 6, category: 'won' },
    { company_id: company.id, key: 'lost', label: 'Lost', sort_order: 7, category: 'lost' },
  ]);

  await admin.from('lead_sources').insert([
    { company_id: company.id, key: 'website', label: 'Website', type: 'digital' },
    { company_id: company.id, key: 'walkin', label: 'Walk-in', type: 'offline' },
    { company_id: company.id, key: 'referral', label: 'Referral', type: 'offline' },
    { company_id: company.id, key: 'cold', label: 'Cold', type: 'offline' },
  ]);

  await admin.from('dispositions').insert([
    { company_id: company.id, code: 'not_picked', label: 'Not picked', requires_notes: false, sort_order: 1 },
    { company_id: company.id, code: 'busy', label: 'Busy', requires_notes: false, sort_order: 2 },
    { company_id: company.id, code: 'callback', label: 'Callback', requires_notes: false, sort_order: 3 },
    { company_id: company.id, code: 'interested', label: 'Interested', requires_notes: false, sort_order: 4 },
    { company_id: company.id, code: 'visit_booked', label: 'Site visit booked', requires_notes: true, sort_order: 5 },
    { company_id: company.id, code: 'not_interested', label: 'Not interested', requires_notes: true, sort_order: 6 },
    { company_id: company.id, code: 'wrong_number', label: 'Wrong number', requires_notes: false, sort_order: 7 },
  ]);

  const supabase = createSupabaseServer();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInErr) return { ok: false, error: 'signin_failed' };

  return { ok: true };
}
