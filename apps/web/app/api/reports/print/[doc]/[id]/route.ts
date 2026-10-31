import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { documentShell, escapeHtml, inr } from '@/lib/pdf/html';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { doc: string; id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('unauthorized', { status: 401 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const { data: company } = await supabase.from('companies')
    .select('name, legal_name, gstin, address, signatory_name, signatory_designation')
    .eq('id', profile!.company_id).single();

  const auto = req.nextUrl.searchParams.get('auto') === '1';
  const base = {
    companyName: company?.legal_name ?? company?.name ?? 'Company',
    gstin: company?.gstin ?? undefined,
    address: company?.address ?? undefined,
    auto,
  };
  const signatory = company?.signatory_name
    ? `<div class="signatory"><div class="line">${escapeHtml(company.signatory_name)}<br><span class="muted">${escapeHtml(company.signatory_designation ?? '')}</span></div></div>`
    : '';

  if (params.doc === 'receipt') {
    const { data: payment } = await supabase.from('payments')
      .select('*, bookings!inner(booking_number, total_value, applicant, leads(name, phone))')
      .eq('id', params.id).maybeSingle();
    if (!payment) return new Response('not_found', { status: 404 });
    const b: any = (payment as any).bookings;
    const app = b?.applicant ?? {};
    return documentShell({
      ...base,
      title: `Receipt ${payment.receipt_no ?? payment.id.slice(0, 8)}`,
      bodyHtml: `
        <h1>Payment receipt</h1>
        <p class="muted">Receipt no. ${escapeHtml(payment.receipt_no ?? '—')} · ${payment.paid_date ?? new Date().toISOString().slice(0, 10)}</p>
        <h2>Received from</h2>
        <p><strong>${escapeHtml(app.name ?? b?.leads?.name)}</strong><br>${escapeHtml(app.phone ?? b?.leads?.phone ?? '')}</p>
        <h2>Booking</h2>
        <p>${escapeHtml(b?.booking_number)} — ${escapeHtml(payment.milestone)}</p>
        <table>
          <tr><th>Description</th><th class="right">Amount</th></tr>
          <tr><td>${escapeHtml(payment.milestone)}</td><td class="right">${inr(payment.amount_paid)}</td></tr>
        </table>
        <div class="total">Total received: ${inr(payment.amount_paid)}</div>
        <p class="muted" style="margin-top:8px">Payment mode: ${escapeHtml(payment.payment_mode ?? '—')} · Ref: ${escapeHtml(payment.reference ?? '—')}</p>
        ${signatory}
      `,
    });
  }

  if (params.doc === 'demand-letter') {
    const { data: payment } = await supabase.from('payments')
      .select('*, bookings!inner(booking_number, total_value, applicant, payment_plan, leads(name, phone))')
      .eq('id', params.id).maybeSingle();
    if (!payment) return new Response('not_found', { status: 404 });
    const b: any = (payment as any).bookings;
    const app = b?.applicant ?? {};
    return documentShell({
      ...base,
      title: `Demand letter ${payment.milestone}`,
      bodyHtml: `
        <h1>Demand letter</h1>
        <p class="muted">${escapeHtml(b?.booking_number)} · ${payment.due_date ?? new Date().toISOString().slice(0, 10)}</p>
        <p>Dear <strong>${escapeHtml(app.name ?? b?.leads?.name)}</strong>,</p>
        <p>This is a demand for the <strong>${escapeHtml(payment.milestone)}</strong> milestone of your booking <strong>${escapeHtml(b?.booking_number)}</strong>.</p>
        <table>
          <tr><th>Milestone</th><th class="right">Amount due</th></tr>
          <tr><td>${escapeHtml(payment.milestone)}</td><td class="right">${inr(payment.amount_due)}</td></tr>
        </table>
        <div class="total">Amount payable: ${inr(payment.amount_due)}</div>
        <p style="margin-top:12px">Kindly remit the above amount by <strong>${payment.due_date ?? '—'}</strong> to avoid delays in construction-linked milestones.</p>
        ${signatory}
      `,
    });
  }

  if (params.doc === 'cost-sheet') {
    const { data: cs } = await supabase.from('cost_sheets')
      .select('*, leads(name, phone), projects(name), units(unit_number, configuration)')
      .eq('id', params.id).maybeSingle();
    if (!cs) return new Response('not_found', { status: 404 });
    const c: any = cs;
    return documentShell({
      ...base,
      title: `Cost sheet ${c.id.slice(0, 8)}`,
      bodyHtml: `
        <h1>Cost sheet</h1>
        <p class="muted">${escapeHtml(c.leads?.name)} · ${escapeHtml(c.projects?.name ?? '')} ${escapeHtml(c.units?.unit_number ?? '')}</p>
        <table>
          <tr><th>Component</th><th class="right">Amount</th></tr>
          <tr><td>Base price</td><td class="right">${inr(c.base_price)}</td></tr>
          <tr><td>PLC</td><td class="right">${inr(c.plc)}</td></tr>
          <tr><td>Parking</td><td class="right">${inr(c.parking)}</td></tr>
          <tr><td>Club house</td><td class="right">${inr(c.club_house)}</td></tr>
          <tr><td>Other charges</td><td class="right">${inr(c.other_charges)}</td></tr>
          <tr><td>GST (${c.gst_rate}%)</td><td class="right">${inr(c.gst_amount)}</td></tr>
          <tr><td>Registration (${c.registration_rate}%)</td><td class="right">${inr(c.registration_amount)}</td></tr>
          <tr><td>Stamp duty (${c.stamp_duty_rate}%)</td><td class="right">${inr(c.stamp_duty_amount)}</td></tr>
        </table>
        <div class="total">Total: ${inr(c.total)}</div>
        ${signatory}
      `,
    });
  }

  if (params.doc === 'booking') {
    const { data: booking } = await supabase.from('bookings')
      .select('*, leads(name, phone), projects(name), units(unit_number, configuration)')
      .eq('id', params.id).maybeSingle();
    if (!booking) return new Response('not_found', { status: 404 });
    const b: any = booking;
    const app = b.applicant ?? {};
    return documentShell({
      ...base,
      title: `Booking ${b.booking_number}`,
      bodyHtml: `
        <h1>Booking confirmation</h1>
        <p class="muted">${escapeHtml(b.booking_number)} · ${b.booking_date}</p>
        <h2>Applicant</h2>
        <p><strong>${escapeHtml(app.name)}</strong> · ${escapeHtml(app.phone ?? '')} ${app.pan ? `· PAN ${escapeHtml(app.pan)}` : ''}</p>
        <h2>Property</h2>
        <p>${escapeHtml(b.projects?.name ?? '')} · ${escapeHtml(b.units?.unit_number ?? '')} · ${escapeHtml(b.units?.configuration ?? '')}</p>
        <table>
          <tr><th>Item</th><th class="right">Amount</th></tr>
          <tr><td>Base price</td><td class="right">${inr(b.base_price)}</td></tr>
          <tr><td>Total value</td><td class="right">${inr(b.total_value)}</td></tr>
          <tr><td>Token received</td><td class="right">${inr(b.token_amount)}</td></tr>
        </table>
        <h2>Payment plan</h2>
        <table>
          <tr><th>Milestone</th><th class="right">%</th><th>Due</th></tr>
          ${(Array.isArray(b.payment_plan) ? b.payment_plan : []).map((m: any) => `
            <tr><td>${escapeHtml(m.milestone ?? m.label ?? '')}</td><td class="right">${m.percent ?? ''}%</td><td>${escapeHtml(m.due_date ?? '—')}</td></tr>
          `).join('')}
        </table>
        <p class="muted" style="margin-top:8px">Status: ${escapeHtml(b.status)}</p>
        ${signatory}
      `,
    });
  }

  return new Response('unknown_doc_type', { status: 400 });
}
