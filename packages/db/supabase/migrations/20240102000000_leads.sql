-- 0002_leads.sql - Phase 1 lead engine
create table if not exists public.lead_statuses (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  key         text not null,
  label       text not null,
  category    text not null check (category in ('open','won','lost','dead')),
  color       text not null default '#64748b',
  sort_order  int  not null default 0,
  is_terminal boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (company_id, key)
);
create index if not exists lead_statuses_company_idx on public.lead_statuses(company_id, sort_order);

create table if not exists public.lead_sources (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  key         text not null,
  label       text not null,
  kind        text not null default 'manual',
  created_at  timestamptz not null default now(),
  unique (company_id, key)
);
create index if not exists lead_sources_company_idx on public.lead_sources(company_id);

create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  name            text not null,
  builder         text,
  location        text,
  rera_number     text,
  status          text check (status in ('pre_launch','launched','under_construction','ready')),
  possession_date date,
  brochure_url    text,
  price_list_url  text,
  usp             text,
  amenities       jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists projects_company_idx on public.projects(company_id, name);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create table if not exists public.leads (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies(id) on delete cascade,
  name                  text not null,
  phone                 text not null,
  alt_phone             text,
  email                 text,
  locality              text,
  city                  text,
  source_id             uuid references public.lead_sources(id) on delete set null,
  campaign              text,
  project_id            uuid references public.projects(id) on delete set null,
  property_type         text check (property_type in ('1bhk','2bhk','3bhk','4bhk','villa','plot','commercial','shop')),
  budget_min            bigint,
  budget_max            bigint,
  purpose               text check (purpose in ('self_use','investment')),
  possession_timeline   text check (possession_timeline in ('immediate','under_construction','flexible')),
  preferred_location    text,
  loan_required         boolean,
  occupation            text,
  status_id             uuid not null references public.lead_statuses(id),
  sub_status            text,
  lost_reason           text,
  assigned_to           uuid references public.users(id) on delete set null,
  assigned_at           timestamptz,
  next_followup_at      timestamptz,
  site_visit_date       timestamptz,
  last_activity_at      timestamptz not null default now(),
  remarks               text,
  tags                  text[] not null default '{}',
  custom_fields         jsonb not null default '{}'::jsonb,
  created_by            uuid references public.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index if not exists leads_company_phone_uniq on public.leads(company_id, phone);
create index if not exists leads_company_assigned_idx on public.leads(company_id, assigned_to, status_id);
create index if not exists leads_company_followup_idx on public.leads(company_id, next_followup_at);
create index if not exists leads_company_created_idx  on public.leads(company_id, created_at desc);
create index if not exists leads_name_trgm            on public.leads using gin (name gin_trgm_ops);

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create table if not exists public.lead_projects (
  lead_id     uuid not null references public.leads(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (lead_id, project_id)
);

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  author_id   uuid references public.users(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists notes_lead_idx on public.notes(lead_id, created_at desc);

create table if not exists public.follow_ups (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  assignee_id   uuid references public.users(id) on delete set null,
  due_at        timestamptz not null,
  done_at       timestamptz,
  channel       text not null default 'call' check (channel in ('call','whatsapp','sms','visit','other')),
  note          text,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now()
);
create index if not exists follow_ups_lead_idx on public.follow_ups(lead_id, due_at desc);
create index if not exists follow_ups_pending_idx on public.follow_ups(company_id, due_at) where done_at is null;

create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  actor_id    uuid references public.users(id) on delete set null,
  entity      text not null,
  entity_id   uuid not null,
  action      text not null,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists activity_log_entity_idx on public.activity_log(entity, entity_id, created_at desc);

create table if not exists public.import_jobs (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  created_by   uuid references public.users(id) on delete set null,
  file_name    text not null,
  total_rows   int  not null default 0,
  inserted     int  not null default 0,
  updated      int  not null default 0,
  skipped      int  not null default 0,
  failed       int  not null default 0,
  errors       jsonb not null default '[]'::jsonb,
  dedupe_mode  text not null default 'skip' check (dedupe_mode in ('skip','update')),
  status       text not null default 'running' check (status in ('running','completed','failed')),
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create table if not exists public.dnc_numbers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  phone       text not null,
  reason      text,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (company_id, phone)
);

create table if not exists public.saved_views (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  owner_id    uuid references public.users(id) on delete cascade,
  name        text not null,
  entity      text not null default 'leads',
  filters     jsonb not null default '{}'::jsonb,
  is_shared   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.alerts (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  kind         text not null default 'info',
  title        text not null,
  body         text,
  entity       text,
  entity_id    uuid,
  resolved_at  timestamptz,
  resolved_by  uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists alerts_open_idx on public.alerts(company_id, created_at desc) where resolved_at is null;

-- can_view_lead helper
create or replace function public.can_view_lead(p_lead_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.leads l
    where l.id = p_lead_id
      and l.company_id = public.current_company_id()
      and (
        public.current_user_role() in ('company_admin','sales_head')
        or l.assigned_to = auth.uid()
        or (public.current_user_role() = 'team_leader' and l.assigned_to in (
          select tm.user_id from public.team_members tm
          join public.teams t on t.id = tm.team_id
          where t.leader_id = auth.uid()
        ))
      )
  );
$$;

-- lead_counts_by_status view
create or replace view public.lead_counts_by_status
  with (security_invoker = true) as
select
  s.company_id,
  s.id           as status_id,
  s.label,
  s.category,
  s.sort_order,
  count(l.id)::int as leads
from public.lead_statuses s
left join public.leads l on l.status_id = s.id and l.company_id = s.company_id
group by s.company_id, s.id, s.label, s.category, s.sort_order;

-- ===================== RLS =====================
alter table public.lead_statuses enable row level security;
drop policy if exists lead_statuses_select on public.lead_statuses;
create policy lead_statuses_select on public.lead_statuses
  for select using (public.is_super_admin() or company_id = public.current_company_id());
drop policy if exists lead_statuses_write on public.lead_statuses;
create policy lead_statuses_write on public.lead_statuses
  for all using (public.is_super_admin() or (company_id = public.current_company_id() and public.is_manager()))
  with check (public.is_super_admin() or (company_id = public.current_company_id() and public.is_manager()));

alter table public.lead_sources enable row level security;
drop policy if exists lead_sources_select on public.lead_sources;
create policy lead_sources_select on public.lead_sources
  for select using (public.is_super_admin() or company_id = public.current_company_id());
drop policy if exists lead_sources_write on public.lead_sources;
create policy lead_sources_write on public.lead_sources
  for all using (public.is_super_admin() or (company_id = public.current_company_id() and public.is_manager()))
  with check (public.is_super_admin() or (company_id = public.current_company_id() and public.is_manager()));

alter table public.projects enable row level security;
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (public.is_super_admin() or company_id = public.current_company_id());
drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects
  for all using (public.is_super_admin() or (company_id = public.current_company_id() and public.is_manager()))
  with check (public.is_super_admin() or (company_id = public.current_company_id() and public.is_manager()));

alter table public.leads enable row level security;
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select using (public.can_view_lead(id));
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert with check (company_id = public.current_company_id());
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update using (public.can_view_lead(id)) with check (company_id = public.current_company_id());
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete using (company_id = public.current_company_id() and public.is_manager());

alter table public.notes enable row level security;
drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes for select using (public.can_view_lead(lead_id));
drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes for insert with check (company_id = public.current_company_id() and public.can_view_lead(lead_id));

alter table public.follow_ups enable row level security;
drop policy if exists follow_ups_select on public.follow_ups;
create policy follow_ups_select on public.follow_ups for select using (public.can_view_lead(lead_id));
drop policy if exists follow_ups_insert on public.follow_ups;
create policy follow_ups_insert on public.follow_ups for insert with check (company_id = public.current_company_id() and public.can_view_lead(lead_id));
drop policy if exists follow_ups_update on public.follow_ups;
create policy follow_ups_update on public.follow_ups for update using (public.can_view_lead(lead_id)) with check (public.can_view_lead(lead_id));

alter table public.activity_log enable row level security;
drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log for select using (public.is_super_admin() or company_id = public.current_company_id());
drop policy if exists activity_log_insert on public.activity_log;
create policy activity_log_insert on public.activity_log for insert with check (company_id = public.current_company_id());

alter table public.import_jobs enable row level security;
drop policy if exists import_jobs_all on public.import_jobs;
create policy import_jobs_all on public.import_jobs for all using (public.is_super_admin() or company_id = public.current_company_id()) with check (company_id = public.current_company_id());

alter table public.dnc_numbers enable row level security;
drop policy if exists dnc_all on public.dnc_numbers;
create policy dnc_all on public.dnc_numbers for all using (public.is_super_admin() or company_id = public.current_company_id()) with check (company_id = public.current_company_id());

alter table public.saved_views enable row level security;
drop policy if exists saved_views_select on public.saved_views;
create policy saved_views_select on public.saved_views for select using (public.is_super_admin() or company_id = public.current_company_id());
drop policy if exists saved_views_write on public.saved_views;
create policy saved_views_write on public.saved_views for all using (company_id = public.current_company_id() and (owner_id = auth.uid() or is_shared)) with check (company_id = public.current_company_id());

alter table public.alerts enable row level security;
drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts for select using (public.is_super_admin() or company_id = public.current_company_id());
drop policy if exists alerts_write on public.alerts;
create policy alerts_write on public.alerts for all using (public.is_super_admin() or (company_id = public.current_company_id() and public.is_manager())) with check (company_id = public.current_company_id());

-- ================ seed defaults on new company ================
create or replace function public.seed_company_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.lead_statuses (company_id, key, label, category, color, sort_order, is_terminal) values
    (new.id, 'new',               'New',                 'open', '#3b82f6',  10, false),
    (new.id, 'attempted',         'Attempted',           'open', '#eab308',  20, false),
    (new.id, 'contacted',         'Contacted',           'open', '#22c55e',  30, false),
    (new.id, 'interested',        'Interested',          'open', '#10b981',  40, false),
    (new.id, 'followup',          'Follow-up/Callback',  'open', '#14b8a6',  50, false),
    (new.id, 'visit_scheduled',   'Site Visit Scheduled','open', '#0ea5e9',  60, false),
    (new.id, 'visit_done',        'Site Visit Done',     'open', '#6366f1',  70, false),
    (new.id, 'negotiation',       'Negotiation',         'open', '#8b5cf6',  80, false),
    (new.id, 'booking_done',      'Token/Booking Done',  'won',  '#16a34a',  90, false),
    (new.id, 'won',               'Won (Sold)',          'won',  '#15803d', 100, true),
    (new.id, 'lost',              'Lost',                'lost', '#ef4444', 110, true),
    (new.id, 'not_interested',    'Not Interested',      'dead', '#94a3b8', 200, true),
    (new.id, 'wrong_number',      'Wrong Number',        'dead', '#94a3b8', 210, true),
    (new.id, 'already_purchased', 'Already Purchased',   'dead', '#94a3b8', 220, true),
    (new.id, 'budget_mismatch',   'Budget Mismatch',     'dead', '#94a3b8', 230, true),
    (new.id, 'location_mismatch', 'Location Mismatch',   'dead', '#94a3b8', 240, true),
    (new.id, 'broker_agent',      'Broker/Agent',        'dead', '#94a3b8', 250, true),
    (new.id, 'junk',              'Junk',                'dead', '#94a3b8', 260, true)
  on conflict (company_id, key) do nothing;

  insert into public.lead_sources (company_id, key, label, kind) values
    (new.id, 'facebook',   'Facebook Lead Ads',     'ads'),
    (new.id, 'instagram',  'Instagram Lead Ads',    'ads'),
    (new.id, 'google_ads', 'Google Ads',            'ads'),
    (new.id, '99acres',    '99acres',               'portal'),
    (new.id, 'magicbricks','MagicBricks',           'portal'),
    (new.id, 'housing',    'Housing.com',           'portal'),
    (new.id, 'nobroker',   'NoBroker',              'portal'),
    (new.id, 'website',    'Website Form',          'manual'),
    (new.id, 'walkin',     'Walk-in',               'manual'),
    (new.id, 'partner',    'Channel Partner',       'partner'),
    (new.id, 'referral',   'Referral',              'manual'),
    (new.id, 'cold',       'Cold Calling',          'manual'),
    (new.id, 'offline',    'Hoardings/Newspaper',   'manual'),
    (new.id, 'whatsapp',   'WhatsApp Click-to-Chat','ads')
  on conflict (company_id, key) do nothing;

  return new;
end $$;

drop trigger if exists trg_companies_seed on public.companies;
create trigger trg_companies_seed after insert on public.companies
  for each row execute function public.seed_company_defaults();

-- backfill demo company
do $$
declare r record;
begin
  for r in select id from public.companies
           where id not in (select company_id from public.lead_statuses) loop
    insert into public.lead_statuses (company_id, key, label, category, color, sort_order, is_terminal) values
      (r.id, 'new',               'New',                 'open', '#3b82f6',  10, false),
      (r.id, 'attempted',         'Attempted',           'open', '#eab308',  20, false),
      (r.id, 'contacted',         'Contacted',           'open', '#22c55e',  30, false),
      (r.id, 'interested',        'Interested',          'open', '#10b981',  40, false),
      (r.id, 'followup',          'Follow-up/Callback',  'open', '#14b8a6',  50, false),
      (r.id, 'visit_scheduled',   'Site Visit Scheduled','open', '#0ea5e9',  60, false),
      (r.id, 'visit_done',        'Site Visit Done',     'open', '#6366f1',  70, false),
      (r.id, 'negotiation',       'Negotiation',         'open', '#8b5cf6',  80, false),
      (r.id, 'booking_done',      'Token/Booking Done',  'won',  '#16a34a',  90, false),
      (r.id, 'won',               'Won (Sold)',          'won',  '#15803d', 100, true),
      (r.id, 'lost',              'Lost',                'lost', '#ef4444', 110, true),
      (r.id, 'not_interested',    'Not Interested',      'dead', '#94a3b8', 200, true),
      (r.id, 'wrong_number',      'Wrong Number',        'dead', '#94a3b8', 210, true),
      (r.id, 'already_purchased', 'Already Purchased',   'dead', '#94a3b8', 220, true),
      (r.id, 'budget_mismatch',   'Budget Mismatch',     'dead', '#94a3b8', 230, true),
      (r.id, 'location_mismatch', 'Location Mismatch',   'dead', '#94a3b8', 240, true),
      (r.id, 'broker_agent',      'Broker/Agent',        'dead', '#94a3b8', 250, true),
      (r.id, 'junk',              'Junk',                'dead', '#94a3b8', 260, true)
    on conflict (company_id, key) do nothing;

    insert into public.lead_sources (company_id, key, label, kind) values
      (r.id, 'facebook',   'Facebook Lead Ads',     'ads'),
      (r.id, 'instagram',  'Instagram Lead Ads',    'ads'),
      (r.id, 'google_ads', 'Google Ads',            'ads'),
      (r.id, '99acres',    '99acres',               'portal'),
      (r.id, 'magicbricks','MagicBricks',           'portal'),
      (r.id, 'housing',    'Housing.com',           'portal'),
      (r.id, 'nobroker',   'NoBroker',              'portal'),
      (r.id, 'website',    'Website Form',          'manual'),
      (r.id, 'walkin',     'Walk-in',               'manual'),
      (r.id, 'partner',    'Channel Partner',       'partner'),
      (r.id, 'referral',   'Referral',              'manual'),
      (r.id, 'cold',       'Cold Calling',          'manual'),
      (r.id, 'offline',    'Hoardings/Newspaper',   'manual'),
      (r.id, 'whatsapp',   'WhatsApp Click-to-Chat','ads')
    on conflict (company_id, key) do nothing;
  end loop;
end $$;
