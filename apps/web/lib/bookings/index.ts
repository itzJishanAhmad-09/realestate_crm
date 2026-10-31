import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateBookingInput {
  lead_id: string;
  project_id?: string;
  unit_id?: string;
  base_price: number;
  total_value: number;
  token_amount: number;
  applicant: Record<string, unknown>;
  payment_plan?: { milestone: string; percent: number; due_date?: string }[];
  channel_partner_id?: string;
  notes?: string;
}

export async function createBooking(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  input: CreateBookingInput,
): Promise<{ id: string; booking_number: string }> {
  const { data, error } = await supabase.from('bookings').insert({
    company_id: companyId,
    lead_id: input.lead_id,
    project_id: input.project_id ?? null,
    unit_id: input.unit_id ?? null,
    base_price: input.base_price,
    total_value: input.total_value,
    token_amount: input.token_amount,
    applicant: input.applicant,
    payment_plan: input.payment_plan ?? [],
    channel_partner_id: input.channel_partner_id ?? null,
    created_by: userId,
    notes: input.notes ?? null,
    status: 'token',
  }).select('id, booking_number').single();
  if (error || !data) throw error ?? new Error('create_booking_failed');

  // Expand payment plan into milestones
  if (Array.isArray(input.payment_plan) && input.payment_plan.length > 0) {
    const rows = input.payment_plan.map((m, i) => ({
      company_id: companyId,
      booking_id: data.id,
      milestone_no: i + 1,
      milestone: m.milestone,
      amount_due: (input.total_value * m.percent) / 100,
      due_date: m.due_date ?? null,
      status: 'pending',
    }));
    await supabase.from('payments').insert(rows);
  }
  return data;
}
