-- Ad spend entry
create table if not exists public.ad_spend (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  date           date not null default current_date,
  platform       text not null check (platform in ('facebook','google','99acres','magicbricks','housing','nobroker','other')),
  source_id      uuid references public.lead_sources(id) on delete set null,
  campaign       text,
  amount         numeric not null default 0,
  currency       text not null default 'INR',
  notes          text,
  created_by     uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists ad_spend_company_idx on public.ad_spend (company_id, date desc);

-- Presence
create table if not exists public.user_presence (
  user_id       uuid primary key references public.users(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  last_seen_at  timestamptz not null default now(),
  current_call_id uuid references public.calls(id) on delete set null,
  status        text not null default 'online' check (status in ('online','on_call','wrapping','idle','offline'))
);
create index if not exists presence_company_idx on public.user_presence (company_id, last_seen_at desc);

-- Subscriptions
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies(id) on delete cascade,
  plan_name              text not null default 'starter',
  seats                  int not null default 5,
  amount_per_seat        numeric not null default 499,
  currency               text not null default 'INR',
  razorpay_sub_id        text,
  status                 text not null default 'trial' check (status in ('trial','active','past_due','canceled')),
  current_period_start   timestamptz not null default now(),
  current_period_end     timestamptz,
  next_billing_at        timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create unique index if not exists subscriptions_company_uidx on public.subscriptions (company_id);

-- Audit log
create table if not exists public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  actor_id       uuid references public.users(id) on delete set null,
  action         text not null,
  entity_type    text not null,
  entity_id      uuid,
  before         jsonb,
  after          jsonb,
  meta           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists audit_company_idx on public.audit_log (company_id, created_at desc);
create index if not exists audit_entity_idx  on public.audit_log (entity_type, entity_id);

-- Backfill missing columns from Phase 2 into Phase 1 tables
alter table public.dnc_numbers add column if not exists added_by uuid references public.users(id) on delete set null;

-- Drop the Phase 1 saved_views table because it uses 'owner_id', but Phase 4 uses 'user_id'
drop table if exists public.saved_views cascade;

create table public.saved_views (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid references public.users(id) on delete cascade,
  entity      text not null check (entity in ('leads','bookings','site_visits','calls')),
  name        text not null,
  filter      jsonb not null default '{}'::jsonb,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.ad_spend       enable row level security;
alter table public.user_presence  enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.audit_log      enable row level security;
alter table public.saved_views    enable row level security;

-- audit trigger
create or replace function public.audit_trigger() returns trigger language plpgsql as $$
declare
  v_company uuid;
begin
  v_company := coalesce(
    case when TG_OP = 'DELETE' then (to_jsonb(OLD)->>'company_id')::uuid
         else (to_jsonb(NEW)->>'company_id')::uuid end,
    public.current_company_id()
  );

  if TG_OP = 'INSERT' then
    insert into public.audit_log (company_id, actor_id, action, entity_type, entity_id, after)
    values (v_company, auth.uid(), 'insert', TG_TABLE_NAME, (to_jsonb(NEW)->>'id')::uuid, to_jsonb(NEW));
  elsif TG_OP = 'UPDATE' then
    insert into public.audit_log (company_id, actor_id, action, entity_type, entity_id, before, after)
    values (v_company, auth.uid(), 'update', TG_TABLE_NAME, (to_jsonb(NEW)->>'id')::uuid, to_jsonb(OLD), to_jsonb(NEW));
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (company_id, actor_id, action, entity_type, entity_id, before)
    values (v_company, auth.uid(), 'delete', TG_TABLE_NAME, (to_jsonb(OLD)->>'id')::uuid, to_jsonb(OLD));
  end if;
  return coalesce(NEW, OLD);
end $$;

drop trigger if exists audit_bookings      on public.bookings;
drop trigger if exists audit_payments      on public.payments;
drop trigger if exists audit_subscriptions on public.subscriptions;
create trigger audit_bookings      after insert or update or delete on public.bookings      for each row execute function public.audit_trigger();
create trigger audit_payments      after insert or update or delete on public.payments      for each row execute function public.audit_trigger();
create trigger audit_subscriptions after insert or update or delete on public.subscriptions for each row execute function public.audit_trigger();

-- Report RPCs
create or replace function public.rpt_funnel(p_from timestamptz default null, p_to timestamptz default null) returns jsonb language plpgsql stable security invoker as $$
declare v_c uuid := public.current_company_id(); v_total int; v_contacted int; v_interested int; v_sched int; v_visited int; v_booked int; v_won int;
begin
  select count(*) into v_total from public.leads where company_id = v_c and (p_from is null or created_at >= p_from) and (p_to is null or created_at <= p_to);
  select count(distinct l.id) into v_contacted from public.leads l join public.calls c on c.lead_id = l.id and c.status = 'completed' where l.company_id = v_c and (p_from is null or l.created_at >= p_from) and (p_to is null or l.created_at <= p_to);
  select count(distinct l.id) into v_interested from public.leads l left join public.lead_statuses s on s.id = l.status_id where l.company_id = v_c and (p_from is null or l.created_at >= p_from) and (p_to is null or l.created_at <= p_to) and s.key in ('interested','callback','visit_scheduled','visit_done','negotiation','token','won');
  select count(distinct l.id) into v_sched from public.leads l join public.site_visits v on v.lead_id = l.id where l.company_id = v_c and (p_from is null or l.created_at >= p_from) and (p_to is null or l.created_at <= p_to);
  select count(distinct l.id) into v_visited from public.leads l join public.site_visits v on v.lead_id = l.id and v.status = 'done' where l.company_id = v_c and (p_from is null or l.created_at >= p_from) and (p_to is null or l.created_at <= p_to);
  select count(distinct l.id) into v_booked from public.leads l join public.bookings b on b.lead_id = l.id where l.company_id = v_c and (p_from is null or l.created_at >= p_from) and (p_to is null or l.created_at <= p_to);
  select count(distinct l.id) into v_won from public.leads l join public.bookings b on b.lead_id = l.id and b.status in ('registered','won') where l.company_id = v_c and (p_from is null or l.created_at >= p_from) and (p_to is null or l.created_at <= p_to);
  return jsonb_build_object('total', v_total, 'contacted', v_contacted, 'interested', v_interested, 'visit_scheduled', v_sched, 'visited', v_visited, 'booked', v_booked, 'won', v_won);
end $$;

create or replace function public.rpt_sources(p_from timestamptz default null, p_to timestamptz default null) returns jsonb language plpgsql stable security invoker as $$
declare v_c uuid := public.current_company_id(); v_out jsonb;
begin
  with l as (select l.*, coalesce(s.label, 'Unknown') as source_name, s.id as source_id from public.leads l left join public.lead_sources s on s.id = l.source_id where l.company_id = v_c and (p_from is null or l.created_at >= p_from) and (p_to is null or l.created_at <= p_to)), agg as (select source_id, source_name, count(*)::int as leads, count(*) filter (where exists (select 1 from public.site_visits v where v.lead_id = l.id))::int as site_visits, count(*) filter (where exists (select 1 from public.bookings b where b.lead_id = l.id))::int as bookings from l group by source_id, source_name)
  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_out from (select a.source_id, a.source_name, a.leads, a.site_visits, a.bookings, coalesce((select sum(amount) from public.ad_spend asp where asp.company_id = v_c and asp.source_id = a.source_id and (p_from is null or asp.date::timestamptz >= p_from) and (p_to is null or asp.date::timestamptz <= p_to)), 0) as spend, 0 as cpl, 0 as cpbook from agg a order by a.leads desc) t;
  return v_out;
end $$;

create or replace function public.rpt_agents(p_from timestamptz default null, p_to timestamptz default null) returns jsonb language plpgsql stable security invoker as $$
declare v_c uuid := public.current_company_id(); v_out jsonb;
begin
  with a as (select u.id, u.full_name as name, u.role from public.users u where u.company_id = v_c and u.role::text in ('telecaller','sales_executive','team_leader','sales_head','sales_exec')), stats as (select a.id, a.name, a.role, (select count(*) from public.calls c where c.agent_id = a.id and (p_from is null or c.started_at >= p_from) and (p_to is null or c.started_at <= p_to))::int as calls, 0::int as connected, 0::int as talk_time, (select count(*) from public.site_visits v where v.created_by = a.id and (p_from is null or v.created_at >= p_from) and (p_to is null or v.created_at <= p_to))::int as visits_booked, (select count(*) from public.bookings b where b.created_by = a.id and (p_from is null or b.created_at >= p_from) and (p_to is null or b.created_at <= p_to))::int as bookings from a)
  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_out from (select * from stats order by calls desc, bookings desc) t;
  return v_out;
end $$;

create or replace function public.rpt_projects(p_from timestamptz default null, p_to timestamptz default null) returns jsonb language plpgsql stable security invoker as $$
declare v_c uuid := public.current_company_id(); v_out jsonb;
begin
  with p as (select id, name from public.projects where company_id = v_c)
  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_out from (select p.id, p.name, (select count(*) from public.leads l where l.project_id = p.id and (p_from is null or l.created_at >= p_from) and (p_to is null or l.created_at <= p_to))::int as leads, (select count(*) from public.site_visits v where v.project_id = p.id and (p_from is null or v.created_at >= p_from) and (p_to is null or v.created_at <= p_to))::int as visits, (select count(*) from public.bookings b where b.project_id = p.id and (p_from is null or b.created_at >= p_from) and (p_to is null or b.created_at <= p_to))::int as bookings, 0::int as units_available, 0::int as units_booked from p order by leads desc) t;
  return v_out;
end $$;

grant execute on function public.rpt_funnel(timestamptz, timestamptz) to authenticated;
grant execute on function public.rpt_sources(timestamptz, timestamptz) to authenticated;
grant execute on function public.rpt_agents(timestamptz, timestamptz) to authenticated;
grant execute on function public.rpt_projects(timestamptz, timestamptz) to authenticated;

-- Policies
drop policy if exists as_select on public.ad_spend;
drop policy if exists as_write on public.ad_spend;
drop policy if exists up_select on public.user_presence;
drop policy if exists up_write on public.user_presence;
drop policy if exists sub_select on public.subscriptions;
drop policy if exists sub_write on public.subscriptions;
drop policy if exists au_select on public.audit_log;
drop policy if exists sv2_select on public.saved_views;
drop policy if exists sv2_write on public.saved_views;
create policy as_select on public.ad_spend for select using (company_id = public.current_company_id());
create policy as_write on public.ad_spend for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id());
create policy up_select on public.user_presence for select using (company_id = public.current_company_id() and (public.is_manager() or user_id = auth.uid()));
create policy up_write on public.user_presence for all using (company_id = public.current_company_id() and user_id = auth.uid()) with check (company_id = public.current_company_id() and user_id = auth.uid());
create policy sub_select on public.subscriptions for select using (company_id = public.current_company_id() and public.is_manager());
create policy sub_write on public.subscriptions for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id());
create policy au_select on public.audit_log for select using (company_id = public.current_company_id() and public.is_manager());
create policy sv2_select on public.saved_views for select using (company_id = public.current_company_id() and (user_id is null or user_id = auth.uid() or public.is_manager()));
create policy sv2_write on public.saved_views for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
