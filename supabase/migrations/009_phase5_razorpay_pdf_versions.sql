
-- ── company letterhead / billing identity (used by print PDFs) ──
alter table public.companies
  add column if not exists legal_name            text,
  add column if not exists gstin                 text,
  add column if not exists address               text,
  add column if not exists letterhead_logo_url   text,
  add column if not exists signatory_name        text,
  add column if not exists signatory_designation text;

-- ── razorpay events audit ──
create table if not exists public.razorpay_events (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references public.companies(id) on delete set null,
  event_type   text not null,
  payload      jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists rp_events_idx on public.razorpay_events (created_at desc);
alter table public.razorpay_events enable row level security;


-- ── add razorpay payment linkage to subscriptions ──
alter table public.subscriptions
  add column if not exists razorpay_order_id    text,
  add column if not exists razorpay_payment_id  text,
  add column if not exists razorpay_signature   text,
  add column if not exists amount_last_paid     numeric not null default 0;

-- ── automation versioning ──
alter table public.automations
  add column if not exists version int not null default 1,
  add column if not exists parent_automation_id uuid references public.automations(id) on delete set null;

-- ── automation templates gallery (platform-wide, company_id null = global) ──
create table if not exists public.automation_templates (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid references public.companies(id) on delete cascade,   -- null = shared
  slug           text not null,
  name           text not null,
  description    text,
  trigger_type   text not null check (trigger_type in (
    'lead_created','lead_status_changed','lead_assigned',
    'site_visit_scheduled','site_visit_completed','follow_up_due')),
  trigger_config jsonb not null default '{}'::jsonb,
  action_type    text not null check (action_type in (
    'send_wa_template','send_sms_template','create_followup',
    'assign_user','add_tag','set_status','create_reminder')),
  action_config  jsonb not null default '{}'::jsonb,
  category       text not null default 'general'
                 check (category in ('general','nurture','site_visit','escalation','compliance')),
  icon           text default '⚡',
  unique (company_id, slug)
);
alter table public.automation_templates enable row level security;


-- ── seed shared templates ──
insert into public.automation_templates
  (slug, name, description, trigger_type, trigger_config, action_type, action_config, category, icon)
values
  ('new_lead_welcome',
   'Welcome new lead',
   'Send a WhatsApp welcome template the moment a lead is created.',
   'lead_created', '{}',
   'send_wa_template', '{"template_name":"lead_welcome","language_code":"en","parameters":["name"]}',
   'nurture', '👋'),
  ('first_callback_30m',
   'First callback in 30 min',
   'Create a follow-up task 30 minutes after a lead is created.',
   'lead_created', '{}',
   'create_followup', '{"minutes_from_now":30,"notes":"First callback — new lead"}',
   'nurture', '📞'),
  ('site_visit_confirm_wa',
   'Confirm site visit on WhatsApp',
   'Send the site-visit confirmation template when a visit is scheduled.',
   'site_visit_scheduled', '{}',
   'send_wa_template', '{"template_name":"site_visit_confirmation","language_code":"en","parameters":["name","project","when"]}',
   'site_visit', '🏠'),
  ('visit_no_show_recovery',
   'No-show recovery',
   'Create a follow-up task 2 hours after a visit is marked no-show.',
   'site_visit_completed', '{"status":"no_show"}',
   'create_followup', '{"minutes_from_now":120,"notes":"Recovery callback after no-show"}',
   'site_visit', '🔄'),
  ('post_visit_feedback',
   'Post-visit feedback ask',
   'Send a feedback request after a visit is marked done.',
   'site_visit_completed', '{"status":"done"}',
   'send_wa_template', '{"template_name":"post_visit_feedback","language_code":"en","parameters":["name","project"]}',
   'site_visit', '⭐'),
  ('hot_lead_escalation',
   'Escalate hot lead to Sales Head',
   'When a lead reaches negotiation, add tag `hot` for manager review.',
   'lead_status_changed', '{"new_status_code":"negotiation"}',
   'add_tag', '{"tag":"hot"}',
   'escalation', '🔥'),
  ('stale_reassign',
   'Reassign stale lead',
   'Create a follow-up 3 days after a lead goes quiet.',
   'lead_status_changed', '{"new_status_code":"contacted"}',
   'create_followup', '{"minutes_from_now":4320,"notes":"Stale-lead check-in"}',
   'nurture', '⏳'),
  ('dnc_compliance',
   'DNC compliance reminder',
   'Log a reminder when a lead is marked Do-Not-Call.',
   'lead_status_changed', '{"new_status_code":"dnc"}',
   'create_reminder', '{"minutes_from_now":1440,"channel":"internal"}',
   'compliance', '🚫')
on conflict do nothing;

-- ── extend automation queue triggers to site_visits + lead reassignment ──
create or replace function public.enqueue_site_visit_automation()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.automation_queue (company_id, trigger_type, entity_type, entity_id, payload)
    values (NEW.company_id, 'site_visit_scheduled', 'site_visit', NEW.id,
            jsonb_build_object('lead_id', NEW.lead_id, 'project_id', NEW.project_id, 'status', NEW.status));
  elsif TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status
        and NEW.status in ('done','no_show','canceled') then
    insert into public.automation_queue (company_id, trigger_type, entity_type, entity_id, payload)
    values (NEW.company_id, 'site_visit_completed', 'site_visit', NEW.id,
            jsonb_build_object('lead_id', NEW.lead_id, 'status', NEW.status));
  end if;
  return NEW;
end $$;

drop trigger if exists site_visits_automation_trigger on public.site_visits;
create trigger site_visits_automation_trigger
  after insert or update of status on public.site_visits
  for each row execute function public.enqueue_site_visit_automation();

create or replace function public.enqueue_lead_assigned()
returns trigger language plpgsql as $$
begin
  if OLD.assigned_to is distinct from NEW.assigned_to and NEW.assigned_to is not null then
    insert into public.automation_queue (company_id, trigger_type, entity_type, entity_id, payload)
    values (NEW.company_id, 'lead_assigned', 'lead', NEW.id,
            jsonb_build_object('assigned_to', NEW.assigned_to, 'previous', OLD.assigned_to));
  end if;
  return NEW;
end $$;

drop trigger if exists leads_assignment_trigger on public.leads;
create trigger leads_assignment_trigger
  after update of assigned_to on public.leads
  for each row execute function public.enqueue_lead_assigned();


-- Policies below --
drop policy if exists rpe_select on public.razorpay_events;
drop policy if exists at_select on public.automation_templates;
drop policy if exists at_write on public.automation_templates;create policy rpe_select on public.razorpay_events for select using (company_id = public.current_company_id() and public.is_manager());
create policy at_select on public.automation_templates for select using (company_id is null or company_id = public.current_company_id());
create policy at_write on public.automation_templates for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id());
