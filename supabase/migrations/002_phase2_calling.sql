create extension if not exists pgcrypto;

create or replace function public.current_company_id() returns uuid as $$
  select company_id from public.users where id = auth.uid() limit 1;
$$ language sql stable security definer;

create or replace function public.is_manager() returns boolean as $$
  select exists(select 1 from public.users where id = auth.uid() and role in ('company_admin', 'sales_head', 'team_leader'));
$$ language sql stable security definer;

alter table public.companies add column if not exists timezone text not null default 'Asia/Kolkata', add column if not exists calling_hours_start time not null default '09:00', add column if not exists calling_hours_end time not null default '20:00';
alter table public.leads add column if not exists last_contacted_at timestamptz, add column if not exists call_attempts int not null default 0, add column if not exists is_dnc boolean not null default false;

create table if not exists public.telephony_configs (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, provider text not null, label text not null default 'default', credentials_enc text not null, caller_id text, webhook_token text not null default encode(gen_random_bytes(24), 'hex'), is_active boolean not null default true, settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (company_id, provider, label));

create table if not exists public.dispositions (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, code text not null, label text not null, category text not null check (category in ('connected','not_connected','positive','negative')), next_status_id uuid references public.lead_statuses(id) on delete set null, default_followup_minutes int, requires_notes boolean not null default false, is_active boolean not null default true, sort_order int not null default 0, created_at timestamptz not null default now(), unique (company_id, code));

create table if not exists public.calls (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, lead_id uuid references public.leads(id) on delete cascade, agent_id uuid references public.users(id) on delete set null, telephony_config_id uuid references public.telephony_configs(id) on delete set null, provider text, provider_call_id text, direction text not null check (direction in ('outbound','inbound')), status text not null default 'initiated' check (status in ('initiated','ringing','in_progress','completed','failed','no_answer','busy','canceled')), from_number text, to_number text, started_at timestamptz not null default now(), answered_at timestamptz, ended_at timestamptz, duration_sec int, talk_time_sec int, recording_url text, disposition_id uuid references public.dispositions(id) on delete set null, notes text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create unique index if not exists calls_provider_uidx on public.calls(provider, provider_call_id) where provider_call_id is not null;
create index if not exists calls_lead_idx on public.calls(company_id, lead_id, started_at desc);
create index if not exists calls_agent_idx on public.calls(company_id, agent_id, started_at desc);

create table if not exists public.call_queue_items (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, agent_id uuid not null references public.users(id) on delete cascade, lead_id uuid not null references public.leads(id) on delete cascade, position int not null default 0, status text not null default 'pending' check (status in ('pending','in_progress','done','skipped')), created_at timestamptz not null default now());
create unique index if not exists call_queue_pending_uidx on public.call_queue_items(agent_id, lead_id) where status = 'pending';

create table if not exists public.site_visits (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, lead_id uuid not null references public.leads(id) on delete cascade, project_id uuid references public.projects(id) on delete set null, unit_id uuid, assigned_to uuid references public.users(id) on delete set null, scheduled_for timestamptz not null, duration_minutes int not null default 60, pickup_required boolean not null default false, pickup_address text, visitors_count int not null default 1, status text not null default 'scheduled' check (status in ('scheduled','confirmed','rescheduled','no_show','done','canceled')), source text not null default 'call' check (source in ('call','whatsapp','walk_in','portal')), location_url text, notes text, created_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.site_visit_feedback (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, site_visit_id uuid not null unique references public.site_visits(id) on delete cascade, liked text, disliked text, unit_shown uuid, objections text, negotiation_notes text, revisit_required boolean not null default false, family_visit_required boolean not null default false, rating int check (rating between 1 and 5), created_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now());

create table if not exists public.reminders (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, entity_type text not null check (entity_type in ('site_visit','follow_up','lead')), entity_id uuid not null, channel text not null check (channel in ('whatsapp','sms','push','internal')), template_id uuid, send_at timestamptz not null, status text not null default 'pending' check (status in ('pending','sent','failed','canceled')), attempts int not null default 0, last_error text, payload jsonb not null default '{}'::jsonb, sent_at timestamptz, created_at timestamptz not null default now());
create index if not exists reminders_due_idx on public.reminders(send_at) where status = 'pending';

create table if not exists public.dnc_numbers (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, phone text not null, reason text, added_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now(), unique (company_id, phone));

alter table public.telephony_configs enable row level security;
alter table public.dispositions enable row level security;
alter table public.calls enable row level security;
alter table public.call_queue_items enable row level security;
alter table public.site_visits enable row level security;
alter table public.site_visit_feedback enable row level security;
alter table public.reminders enable row level security;
alter table public.dnc_numbers enable row level security;

drop policy if exists tc_select on public.telephony_configs;
drop policy if exists tc_write on public.telephony_configs;
drop policy if exists disp_select on public.dispositions;
drop policy if exists disp_write on public.dispositions;
drop policy if exists calls_select on public.calls;
drop policy if exists calls_insert on public.calls;
drop policy if exists calls_update on public.calls;
drop policy if exists cq_all on public.call_queue_items;
drop policy if exists sv_select on public.site_visits;
drop policy if exists sv_write on public.site_visits;
drop policy if exists svf_select on public.site_visit_feedback;
drop policy if exists svf_write on public.site_visit_feedback;
drop policy if exists rem_select on public.reminders;
drop policy if exists dnc_select on public.dnc_numbers;
drop policy if exists dnc_write on public.dnc_numbers;

create policy tc_select on public.telephony_configs for select using (company_id = public.current_company_id() and public.is_manager());
create policy tc_write on public.telephony_configs for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id() and public.is_manager());
create policy disp_select on public.dispositions for select using (company_id = public.current_company_id());
create policy disp_write on public.dispositions for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id() and public.is_manager());
create policy calls_select on public.calls for select using (company_id = public.current_company_id() and (public.is_manager() or agent_id = auth.uid()));
create policy calls_insert on public.calls for insert with check (company_id = public.current_company_id() and (public.is_manager() or agent_id = auth.uid()));
create policy calls_update on public.calls for update using (company_id = public.current_company_id() and (public.is_manager() or agent_id = auth.uid()));
create policy cq_all on public.call_queue_items for all using (company_id = public.current_company_id() and (public.is_manager() or agent_id = auth.uid())) with check (company_id = public.current_company_id() and (public.is_manager() or agent_id = auth.uid()));
create policy sv_select on public.site_visits for select using (company_id = public.current_company_id() and (public.is_manager() or assigned_to = auth.uid() or created_by = auth.uid()));
create policy sv_write on public.site_visits for all using (company_id = public.current_company_id() and (public.is_manager() or created_by = auth.uid() or assigned_to = auth.uid())) with check (company_id = public.current_company_id());
create policy svf_select on public.site_visit_feedback for select using (company_id = public.current_company_id());
create policy svf_write on public.site_visit_feedback for all using (company_id = public.current_company_id() and (public.is_manager() or created_by = auth.uid())) with check (company_id = public.current_company_id());
create policy rem_select on public.reminders for select using (company_id = public.current_company_id() and public.is_manager());
create policy dnc_select on public.dnc_numbers for select using (company_id = public.current_company_id());
create policy dnc_write on public.dnc_numbers for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id() and public.is_manager());

insert into public.dispositions (company_id, code, label, category, default_followup_minutes, sort_order)
select c.id, d.code, d.label, d.category, d.mins, d.ord from public.companies c
cross join (values ('not_picked', 'Not Picked', 'not_connected', 120, 10), ('busy', 'Busy', 'not_connected', 120, 20), ('switched_off', 'Switched Off', 'not_connected', 240, 30), ('invalid', 'Wrong Number', 'negative', null, 40), ('connected', 'Connected', 'connected', 1440, 50), ('interested', 'Interested', 'positive', 1440, 60), ('callback', 'Callback Requested', 'connected', 60, 70), ('visit_scheduled', 'Site Visit Scheduled', 'positive', null, 80), ('not_interested', 'Not Interested', 'negative', null, 90), ('dnc', 'Do Not Call', 'negative', null, 100)) as d(code, label, category, mins, ord)
on conflict (company_id, code) do nothing;
