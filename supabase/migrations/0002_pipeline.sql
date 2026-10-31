create table public.lead_statuses (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  key         text not null,                    -- e.g. 'new','contacted','site_visit_scheduled'
  label       text not null,
  category    text not null check (category in ('open','in_progress','won','lost','dead')),
  sort_order  int  not null default 0,
  is_system   boolean not null default false,
  color       text not null default 'slate',
  created_at  timestamptz not null default now(),
  unique (company_id, key)
);
create index lead_statuses_company_idx on public.lead_statuses(company_id, sort_order);

create table public.lead_sources (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  key         text not null,
  label       text not null,
  type        text not null default 'manual'
              check (type in ('manual','facebook','google','portal','website','whatsapp','referral','walkin')),
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (company_id, key)
);

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  name            text not null,
  builder         text,
  locality        text,
  city            text,
  rera_number     text,
  status          text not null default 'launched'
                  check (status in ('pre_launch','launched','under_construction','ready')),
  possession_date date,
  brochure_path   text,
  location_lat    numeric(9,6),
  location_lng    numeric(9,6),
  notes           text,
  is_active       boolean not null default true,
  last_assigned_user_id uuid references public.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index projects_company_idx on public.projects(company_id, is_active);
create trigger projects_touch before update on public.projects
  for each row execute function public.tg_touch_updated_at();