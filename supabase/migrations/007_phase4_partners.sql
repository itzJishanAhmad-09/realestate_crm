-- Add channel_partner and sales_executive to the user_role enum safely


-- track which partner submitted a lead
alter table public.leads add column if not exists submitted_by_partner_id uuid references public.users(id) on delete set null;
create index if not exists leads_partner_idx on public.leads (submitted_by_partner_id) where submitted_by_partner_id is not null;

create table if not exists public.channel_partner_profiles (
  user_id         uuid primary key references public.users(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  firm_name       text,
  rera_number     text,
  pan_number      text,
  bank_account    text,
  ifsc            text,
  commission_rate numeric not null default 1.5,  -- percent
  onboarding_at   timestamptz default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.channel_partner_commissions (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  partner_id     uuid not null references public.users(id) on delete cascade,
  booking_id     uuid not null references public.bookings(id) on delete cascade,
  base_amount    numeric not null default 0,
  rate           numeric not null default 1.5,
  commission     numeric not null default 0,
  status         text not null default 'pending'
                 check (status in ('pending','approved','paid','cancelled')),
  paid_at        timestamptz,
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists cpc_partner_idx on public.channel_partner_commissions (partner_id, status);

-- helper
create or replace function public.is_partner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'channel_partner');
$$;

-- RESTRICTIVE policies (AND'd with existing) — restrict partners without touching other roles


-- RLS for the two new tables
alter table public.channel_partner_profiles enable row level security;
alter table public.channel_partner_commissions enable row level security;




-- Policies below --
drop policy if exists leads_partner_restrict on public.leads;
drop policy if exists calls_partner_restrict on public.calls;
drop policy if exists sv_partner_restrict on public.site_visits;
drop policy if exists bk_partner_restrict on public.bookings;
drop policy if exists cpc_partner_restrict on public.channel_partner_commissions;
drop policy if exists cpp_select on public.channel_partner_profiles;
drop policy if exists cpp_write on public.channel_partner_profiles;
drop policy if exists cpc_select on public.channel_partner_commissions;
drop policy if exists cpc_write on public.channel_partner_commissions;create policy leads_partner_restrict on public.leads as restrictive for select using (not public.is_partner() or submitted_by_partner_id = auth.uid());
create policy calls_partner_restrict on public.calls as restrictive for select using (not public.is_partner() or lead_id in (select id from public.leads where submitted_by_partner_id = auth.uid()));
create policy sv_partner_restrict on public.site_visits as restrictive for select using (not public.is_partner() or lead_id in (select id from public.leads where submitted_by_partner_id = auth.uid()));
create policy bk_partner_restrict on public.bookings as restrictive for select using (not public.is_partner() or lead_id in (select id from public.leads where submitted_by_partner_id = auth.uid()));
create policy cpc_partner_restrict on public.channel_partner_commissions as restrictive for select using (not public.is_partner() or partner_id = auth.uid());
create policy cpp_select on public.channel_partner_profiles for select using (company_id = public.current_company_id());
create policy cpp_write on public.channel_partner_profiles for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id());
create policy cpc_select on public.channel_partner_commissions for select using (company_id = public.current_company_id() and (public.is_manager() or partner_id = auth.uid()));
create policy cpc_write on public.channel_partner_commissions for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id());
