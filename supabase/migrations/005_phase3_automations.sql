-- ── Automations ──
create table if not exists public.automations (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  name           text not null,
  description    text,
  trigger_type   text not null check (trigger_type in ('lead_created','lead_status_changed','lead_assigned','site_visit_scheduled','site_visit_completed','follow_up_due')),
  trigger_config jsonb not null default '{}'::jsonb,
  action_type    text not null check (action_type in ('send_wa_template','send_sms_template','create_followup','assign_user','add_tag','set_status','create_reminder')),
  action_config  jsonb not null default '{}'::jsonb,
  is_active      boolean not null default true,
  order_index    int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists automations_trigger_idx on public.automations (company_id, trigger_type, is_active);

create table if not exists public.automation_queue (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  trigger_type text not null,
  entity_type  text not null,
  entity_id    uuid not null,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending' check (status in ('pending','processing','done','failed')),
  attempts     int not null default 0,
  error        text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists automation_queue_pending_idx on public.automation_queue (status, created_at) where status = 'pending';

create table if not exists public.automation_runs (
  id            uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  entity_type   text not null,
  entity_id     uuid not null,
  status        text not null default 'pending' check (status in ('pending','running','succeeded','failed','skipped')),
  action_result jsonb not null default '{}'::jsonb,
  error         text,
  started_at    timestamptz default now(),
  completed_at  timestamptz
);
create index if not exists runs_automation_idx on public.automation_runs (automation_id, started_at desc);

-- ── Cost sheets ──
create table if not exists public.cost_sheets (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  lead_id              uuid not null references public.leads(id) on delete cascade,
  unit_id              uuid,
  project_id           uuid references public.projects(id) on delete set null,
  currency             text not null default 'INR',
  base_price           numeric not null,
  plc                  numeric not null default 0,
  parking              numeric not null default 0,
  club_house           numeric not null default 0,
  other_charges        numeric not null default 0,
  gst_rate             numeric not null default 5,
  gst_amount           numeric not null default 0,
  registration_rate    numeric not null default 6,
  registration_amount  numeric not null default 0,
  stamp_duty_rate      numeric not null default 5,
  stamp_duty_amount    numeric not null default 0,
  total                numeric not null,
  payment_plan         jsonb not null default '[]'::jsonb,
  valid_until          timestamptz,
  created_by           uuid references public.users(id) on delete set null,
  created_at           timestamptz not null default now()
);
create index if not exists cost_sheets_lead_idx on public.cost_sheets (company_id, lead_id, created_at desc);

-- ── RLS ──
alter table public.automations        enable row level security;
alter table public.automation_queue   enable row level security;
alter table public.automation_runs    enable row level security;
alter table public.cost_sheets        enable row level security;

create policy auto_select on public.automations for select using (company_id = public.current_company_id());
create policy auto_write on public.automations for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id() and public.is_manager());
create policy aq_select on public.automation_queue for select using (company_id = public.current_company_id() and public.is_manager());
create policy runs_select on public.automation_runs for select using (company_id = public.current_company_id() and public.is_manager());
create policy cs_select on public.cost_sheets for select using (company_id = public.current_company_id());
create policy cs_write on public.cost_sheets for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());

-- ── Trigger: enqueue automation events when leads change ──
create or replace function public.enqueue_lead_automation()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.automation_queue (company_id, trigger_type, entity_type, entity_id, payload)
    values (NEW.company_id, 'lead_created', 'lead', NEW.id, jsonb_build_object('status_id', NEW.status_id));
  elsif (TG_OP = 'UPDATE' and OLD.status_id is distinct from NEW.status_id) then
    insert into public.automation_queue (company_id, trigger_type, entity_type, entity_id, payload)
    values (NEW.company_id, 'lead_status_changed', 'lead', NEW.id, jsonb_build_object('old_status_id', OLD.status_id, 'new_status_id', NEW.status_id));
  end if;
  return NEW;
end $$;

drop trigger if exists leads_automation_trigger on public.leads;
create trigger leads_automation_trigger after insert or update of status_id on public.leads for each row execute function public.enqueue_lead_automation();

-- ── Cost sheet generator ──
create or replace function public.generate_cost_sheet(
  p_lead_id uuid,
  p_unit_id uuid,
  p_payment_plan jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_company uuid := public.current_company_id();
  v_base numeric; v_plc numeric; v_parking numeric; v_club numeric; v_other numeric;
  v_subtotal numeric; v_gst numeric; v_reg numeric; v_stamp numeric; v_total numeric;
  v_gst_rate numeric := 5; v_reg_rate numeric := 6; v_stamp_rate numeric := 5;
  v_id uuid;
begin
  v_base := 0; v_plc := 0; v_parking := 0; v_club := 0; v_other := 0;
  v_subtotal := 0;
  v_gst := 0; v_reg := 0; v_stamp := 0; v_total := 0;

  insert into public.cost_sheets (
    company_id, lead_id, unit_id, base_price, plc, parking, club_house, other_charges, gst_rate, gst_amount, registration_rate, registration_amount, stamp_duty_rate, stamp_duty_amount, total, payment_plan, created_by
  ) values (
    v_company, p_lead_id, p_unit_id, v_base, v_plc, v_parking, v_club, v_other, v_gst_rate, v_gst, v_reg_rate, v_reg, v_stamp_rate, v_stamp, v_total, p_payment_plan, auth.uid()
  ) returning id into v_id;
  return v_id;
end $$;

grant execute on function public.generate_cost_sheet(uuid, uuid, jsonb) to authenticated;
