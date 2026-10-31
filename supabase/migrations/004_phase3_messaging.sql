
create table if not exists public.messaging_configs (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, channel text not null check (channel in ('whatsapp','sms')), provider text not null check (provider in ('meta_cloud','gupshup','interakt','msg91','karix','twilio')), label text not null default 'default', credentials_enc text not null, sender_id text, webhook_token text not null default encode(gen_random_bytes(24), 'hex'), is_active boolean not null default true, created_at timestamptz not null default now(), unique (company_id, channel, provider, label));
create table if not exists public.wa_templates (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, display_name text not null, language_code text not null default 'en', category text not null default 'marketing' check (category in ('marketing','utility','authentication')), body text not null, variables jsonb not null default '[]'::jsonb, header_type text check (header_type in ('none','text','image','document','video')), header_content text, footer text, provider_template_id text, status text not null default 'draft' check (status in ('draft','pending_approval','approved','rejected','paused')), rejection_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (company_id, name, language_code));
create table if not exists public.sms_templates (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, display_name text not null, body text not null, variables jsonb not null default '[]'::jsonb, dlt_template_id text, dlt_entity_id text, sender_id text, status text not null default 'draft' check (status in ('draft','pending_dlt','active','paused')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (company_id, name));
create table if not exists public.campaigns (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, channel text not null check (channel in ('whatsapp','sms')), wa_template_id uuid references public.wa_templates(id) on delete set null, sms_template_id uuid references public.sms_templates(id) on delete set null, filter jsonb not null default '{}'::jsonb, status text not null default 'draft' check (status in ('draft','scheduled','running','completed','failed','canceled')), scheduled_at timestamptz, started_at timestamptz, completed_at timestamptz, total_recipients int not null default 0, sent_count int not null default 0, failed_count int not null default 0, skipped_count int not null default 0, created_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now());
create index if not exists campaigns_company_idx on public.campaigns (company_id, status, created_at desc);
create table if not exists public.campaign_recipients (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade, company_id uuid not null references public.companies(id) on delete cascade, lead_id uuid not null references public.leads(id) on delete cascade, phone text not null, status text not null default 'pending' check (status in ('pending','sent','failed','skipped')), provider_message_id text, error text, sent_at timestamptz, unique (campaign_id, lead_id));
create index if not exists campaign_recipients_status_idx on public.campaign_recipients (campaign_id, status);
create table if not exists public.messages (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, lead_id uuid references public.leads(id) on delete set null, campaign_id uuid references public.campaigns(id) on delete set null, channel text not null check (channel in ('whatsapp','sms')), direction text not null check (direction in ('outbound','inbound')), to_number text, from_number text, body text, template_id uuid, template_type text check (template_type in ('whatsapp','sms')), provider text, provider_message_id text, status text not null default 'queued' check (status in ('queued','sent','delivered','read','failed','received')), error text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists messages_lead_idx on public.messages (company_id, lead_id, created_at desc);
create index if not exists messages_provider_idx on public.messages (provider, provider_message_id) where provider_message_id is not null;
alter table public.messaging_configs enable row level security; alter table public.wa_templates enable row level security; alter table public.sms_templates enable row level security; alter table public.campaigns enable row level security; alter table public.campaign_recipients enable row level security; alter table public.messages enable row level security;



-- Policies below --
drop policy if exists mc_select on public.messaging_configs;
drop policy if exists mc_write on public.messaging_configs;
drop policy if exists wa_select on public.wa_templates;
drop policy if exists wa_write on public.wa_templates;
drop policy if exists sms_select on public.sms_templates;
drop policy if exists sms_write on public.sms_templates;
drop policy if exists camp_select on public.campaigns;
drop policy if exists camp_write on public.campaigns;
drop policy if exists camp_rec_select on public.campaign_recipients;
drop policy if exists camp_rec_write on public.campaign_recipients;
drop policy if exists msg_select on public.messages;
drop policy if exists msg_insert on public.messages;create policy mc_select on public.messaging_configs for select using (company_id = public.current_company_id() and public.is_manager());
create policy mc_write on public.messaging_configs for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id() and public.is_manager());
create policy wa_select on public.wa_templates for select using (company_id = public.current_company_id());
create policy wa_write on public.wa_templates for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id() and public.is_manager());
create policy sms_select on public.sms_templates for select using (company_id = public.current_company_id());
create policy sms_write on public.sms_templates for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id() and public.is_manager());
create policy camp_select on public.campaigns for select using (company_id = public.current_company_id());
create policy camp_write on public.campaigns for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id() and public.is_manager());
create policy camp_rec_select on public.campaign_recipients for select using (company_id = public.current_company_id());
create policy camp_rec_write on public.campaign_recipients for all using (company_id = public.current_company_id() and public.is_manager()) with check (company_id = public.current_company_id() and public.is_manager());
create policy msg_select on public.messages for select using (company_id = public.current_company_id() and (public.is_manager() or lead_id in (select id from public.leads where assigned_to = auth.uid())));
create policy msg_insert on public.messages for insert with check (company_id = public.current_company_id());
