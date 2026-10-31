create type public.lead_purpose as enum ('self_use','investment');
create type public.possession_timeline as enum ('immediate','under_construction','flexible');
create type public.property_type as enum ('1bhk','2bhk','3bhk','4bhk','villa','plot','commercial','shop','other');

create table public.leads (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references public.companies(id) on delete cascade,
  name                    text not null,
  phone                   text not null,                     -- E.164, e.g. +919876543210
  alt_phone               text,
  email                   citext,
  locality                text,
  city                    text,
  source_id               uuid references public.lead_sources(id),
  campaign                text,
  project_id              uuid references public.projects(id),
  property_type           public.property_type,
  budget_min              bigint,
  budget_max              bigint,
  purpose                 public.lead_purpose,
  possession_timeline     public.possession_timeline,
  preferred_location      text,
  loan_required           boolean,
  occupation              text,
  status_id               uuid not null references public.lead_statuses(id),
  sub_status              text,
  lost_reason             text
                          check (lost_reason is null or lost_reason in
                            ('price','location','competitor','loan_rejected','postponed','not_responding','other')),
  tags                    text[] not null default '{}',
  assigned_to             uuid references public.users(id),
  assigned_at             timestamptz,
  site_visit_date         timestamptz,
  next_followup_at        timestamptz,
  last_activity_at        timestamptz not null default now(),
  remarks                 text,
  custom_fields           jsonb not null default '{}'::jsonb,
  external_id             text,                              -- source-specific id (fb leadgen_id etc.)
  raw_payload             jsonb,                             -- for audit / debugging
  created_by              uuid references public.users(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- dedupe: same phone within company may exist only once unless merged manually
create unique index leads_company_phone_uidx on public.leads(company_id, phone);
create index leads_company_assigned_idx on public.leads(company_id, assigned_to, status_id);
create index leads_company_status_idx   on public.leads(company_id, status_id, created_at desc);
create index leads_company_followup_idx on public.leads(company_id, next_followup_at) where next_followup_at is not null;
create index leads_company_project_idx  on public.leads(company_id, project_id);
create index leads_company_source_idx   on public.leads(company_id, source_id);
create index leads_name_trgm            on public.leads using gin (name gin_trgm_ops);
create index leads_phone_trgm           on public.leads using gin (phone gin_trgm_ops);
create index leads_tags_gin             on public.leads using gin (tags);

create trigger leads_touch before update on public.leads
  for each row execute function public.tg_touch_updated_at();

-- link a lead to multiple interested projects
create table public.lead_projects (
  lead_id     uuid not null references public.leads(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  primary key (lead_id, project_id)
);

create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  author_id   uuid references public.users(id),
  body        text not null,
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notes_lead_idx on public.notes(lead_id, created_at desc);

create table public.follow_ups (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  assignee_id   uuid references public.users(id),
  due_at        timestamptz not null,
  done_at       timestamptz,
  channel       text not null default 'call' check (channel in ('call','whatsapp','sms','visit','other')),
  note          text,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now()
);
create index follow_ups_due_idx on public.follow_ups(company_id, assignee_id, due_at) where done_at is null;

create table public.saved_views (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  owner_id    uuid not null references public.users(id) on delete cascade,
  name        text not null,
  filters     jsonb not null default '{}'::jsonb,
  is_shared   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.dnc_numbers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  phone       text not null,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (company_id, phone)
);

create table public.import_jobs (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  created_by   uuid references public.users(id),
  status       text not null default 'pending'
               check (status in ('pending','running','completed','failed')),
  file_name    text,
  total_rows   int  not null default 0,
  inserted     int  not null default 0,
  updated      int  not null default 0,
  skipped      int  not null default 0,
  failed       int  not null default 0,
  errors       jsonb not null default '[]'::jsonb,
  dedupe_mode  text not null default 'skip' check (dedupe_mode in ('skip','update','merge')),
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

-- alerts for speed-to-lead, escalations etc.
create table public.alerts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  lead_id     uuid references public.leads(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  target_role text,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index alerts_company_open_idx on public.alerts(company_id, created_at desc) where resolved_at is null;