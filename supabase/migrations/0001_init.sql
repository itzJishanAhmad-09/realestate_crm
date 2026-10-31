create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "citext";

-- ============ COMPANIES ============
create table public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          citext not null unique,
  timezone      text not null default 'Asia/Kolkata',
  currency      text not null default 'INR',
  calling_hours_start time not null default '09:00',
  calling_hours_end   time not null default '20:00',
  speed_to_lead_minutes int not null default 5,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============ USERS (profile, linked to auth.users) ============
create type public.user_role as enum (
  'super_admin','company_admin','sales_head','team_leader','telecaller','sales_exec'
);

create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete cascade,
  team_id       uuid,
  role          public.user_role not null default 'telecaller',
  full_name     text not null,
  email         citext not null,
  phone         text,
  is_active     boolean not null default true,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index users_company_idx on public.users(company_id);
create index users_team_idx on public.users(team_id);

-- ============ TEAMS ============
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  leader_id   uuid references public.users(id),
  created_at  timestamptz not null default now(),
  unique (company_id, name)
);
alter table public.users
  add constraint users_team_fk foreign key (team_id) references public.teams(id) on delete set null;

-- ============ ACTIVITY LOG ============
create table public.activity_log (
  id          bigserial primary key,
  company_id  uuid not null references public.companies(id) on delete cascade,
  actor_id    uuid references public.users(id),
  entity      text not null,
  entity_id   uuid,
  action      text not null,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index activity_log_entity_idx on public.activity_log(company_id, entity, entity_id, created_at desc);

-- ============ UPDATED_AT TRIGGER ============
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger companies_touch before update on public.companies
  for each row execute function public.tg_touch_updated_at();
create trigger users_touch before update on public.users
  for each row execute function public.tg_touch_updated_at();

-- ============ AUTH HELPERS (security definer) ============
create or replace function public.auth_user()
returns public.users language sql stable security definer
set search_path = public as $$
  select * from public.users where id = auth.uid();
$$;

create or replace function public.auth_company_id()
returns uuid language sql stable security definer
set search_path = public as $$
  select company_id from public.users where id = auth.uid();
$$;

create or replace function public.auth_role()
returns public.user_role language sql stable security definer
set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.auth_team_id()
returns uuid language sql stable security definer
set search_path = public as $$
  select team_id from public.users where id = auth.uid();
$$;

create or replace function public.auth_is_manager()
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce(role in ('company_admin','sales_head','team_leader','super_admin'), false)
  from public.users where id = auth.uid();
$$;

create or replace function public.auth_is_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce(role in ('company_admin','super_admin'), false)
  from public.users where id = auth.uid();
$$;

-- auto-create profile row on signup (company onboarding creates the company_id)
create or replace function public.tg_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, role, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'telecaller',
    nullif(new.raw_user_meta_data->>'company_id','')::uuid
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_handle_new_user();