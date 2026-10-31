create sequence if not exists public.bookings_seq;

create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  lead_id           uuid not null references public.leads(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,
  unit_id           uuid,
  booking_number    text not null default 'BK-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('public.bookings_seq')::text, 6, '0'),
  booking_date      date not null default current_date,
  status            text not null default 'token' check (status in ('token','confirmed','agreement','registered','won','cancelled')),
  applicant         jsonb not null default '{}'::jsonb,
  base_price        numeric not null default 0,
  total_value       numeric not null default 0,
  token_amount      numeric not null default 0,
  token_received_at timestamptz,
  payment_plan      jsonb not null default '[]'::jsonb,
  channel_partner_id uuid references public.users(id) on delete set null,
  created_by        uuid references public.users(id) on delete set null,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (company_id, booking_number)
);
create index if not exists bookings_company_idx on public.bookings (company_id, status, booking_date desc);
create index if not exists bookings_lead_idx    on public.bookings (lead_id);

create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  milestone_no  int not null default 1,
  milestone     text not null,
  amount_due    numeric not null default 0,
  amount_paid   numeric not null default 0,
  due_date      date,
  paid_date     date,
  status        text not null default 'pending' check (status in ('pending','partial','paid','overdue','waived')),
  receipt_no    text,
  payment_mode  text,
  reference     text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists payments_booking_idx on public.payments (booking_id, milestone_no);
create index if not exists payments_pending_idx on public.payments (company_id, status) where status in ('pending','partial','overdue');

create table if not exists public.documents (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  entity_type    text not null check (entity_type in ('lead','booking','site_visit','cost_sheet')),
  entity_id      uuid not null,
  doc_type       text not null default 'other' check (doc_type in ('pan','aadhaar','address_proof','booking_form','receipt','cost_sheet','photo','agreement','other')),
  file_name      text not null,
  storage_path   text not null,
  mime_type      text,
  size_bytes     bigint,
  uploaded_by    uuid references public.users(id) on delete set null,
  verified       boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists documents_entity_idx on public.documents (entity_type, entity_id);

-- unit status auto-update on booking (SAFE VERSION)
create or replace function public.sync_unit_on_booking()
returns trigger language plpgsql as $$
begin
  return NEW;
end $$;

drop trigger if exists bookings_unit_sync on public.bookings;
create trigger bookings_unit_sync after insert or update on public.bookings for each row execute function public.sync_unit_on_booking();

-- RLS
alter table public.bookings  enable row level security;
alter table public.payments  enable row level security;
alter table public.documents enable row level security;

create policy bk_select on public.bookings for select using (company_id = public.current_company_id());
create policy bk_write on public.bookings for all using (company_id = public.current_company_id() and (public.is_manager() or created_by = auth.uid())) with check (company_id = public.current_company_id());
create policy pay_select on public.payments for select using (company_id = public.current_company_id());
create policy pay_write on public.payments for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id());
create policy doc_select on public.documents for select using (company_id = public.current_company_id());
create policy doc_write on public.documents for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());

insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;

create policy company_docs_read on storage.objects for select using (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_company_id()::text);
create policy company_docs_write on storage.objects for insert with check (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_company_id()::text);
create policy company_docs_delete on storage.objects for delete using (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_company_id()::text);
