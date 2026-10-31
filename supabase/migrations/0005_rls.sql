alter table public.companies        enable row level security;
alter table public.users            enable row level security;
alter table public.teams            enable row level security;
alter table public.activity_log     enable row level security;
alter table public.lead_statuses    enable row level security;
alter table public.lead_sources     enable row level security;
alter table public.projects         enable row level security;
alter table public.leads            enable row level security;
alter table public.lead_projects    enable row level security;
alter table public.notes            enable row level security;
alter table public.follow_ups       enable row level security;
alter table public.saved_views      enable row level security;
alter table public.dnc_numbers      enable row level security;
alter table public.import_jobs      enable row level security;
alter table public.alerts           enable row level security;

create policy companies_read on public.companies for select using (id = public.auth_company_id() or public.auth_role() = 'super_admin');
create policy companies_write on public.companies for all using (public.auth_is_admin() and id = public.auth_company_id()) with check (public.auth_is_admin() and id = public.auth_company_id());

create policy users_read_same_company on public.users for select using (company_id = public.auth_company_id());
create policy users_self_update on public.users for update using (id = auth.uid()) with check (id = auth.uid());
create policy users_admin_manage on public.users for all using (public.auth_is_admin() and company_id = public.auth_company_id()) with check (public.auth_is_admin() and company_id = public.auth_company_id());

create policy teams_read on public.teams for select using (company_id = public.auth_company_id());
create policy teams_admin on public.teams for all using (public.auth_is_admin() and company_id = public.auth_company_id()) with check (public.auth_is_admin() and company_id = public.auth_company_id());

create policy activity_read on public.activity_log for select using (company_id = public.auth_company_id());
create policy activity_insert on public.activity_log for insert with check (company_id = public.auth_company_id());

create policy statuses_read on public.lead_statuses for select using (company_id = public.auth_company_id());
create policy statuses_write on public.lead_statuses for all using (public.auth_is_admin() and company_id = public.auth_company_id()) with check (public.auth_is_admin() and company_id = public.auth_company_id());

create policy sources_read on public.lead_sources for select using (company_id = public.auth_company_id());
create policy sources_write on public.lead_sources for all using (public.auth_is_admin() and company_id = public.auth_company_id()) with check (public.auth_is_admin() and company_id = public.auth_company_id());

create policy projects_read on public.projects for select using (company_id = public.auth_company_id());
create policy projects_write on public.projects for all using (public.auth_is_manager() and company_id = public.auth_company_id()) with check (public.auth_is_manager() and company_id = public.auth_company_id());

create policy leads_admin_all on public.leads for all using (public.auth_role() in ('company_admin','sales_head','super_admin') and company_id = public.auth_company_id()) with check (public.auth_role() in ('company_admin','sales_head','super_admin') and company_id = public.auth_company_id());
create policy leads_leader_team on public.leads for all using (public.auth_role() = 'team_leader' and company_id = public.auth_company_id() and (assigned_to is null or assigned_to in (select id from public.users where team_id = public.auth_team_id()))) with check (public.auth_role() = 'team_leader' and company_id = public.auth_company_id());
create policy leads_agent_own on public.leads for select using (public.auth_role() in ('telecaller','sales_exec') and company_id = public.auth_company_id() and assigned_to = auth.uid());
create policy leads_agent_update on public.leads for update using (public.auth_role() in ('telecaller','sales_exec') and company_id = public.auth_company_id() and assigned_to = auth.uid()) with check (assigned_to = auth.uid() and company_id = public.auth_company_id());

create policy notes_read on public.notes for select using (company_id = public.auth_company_id());
create policy notes_write on public.notes for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

create policy followups_read on public.follow_ups for select using (company_id = public.auth_company_id());
create policy followups_write on public.follow_ups for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

create policy lead_projects_read on public.lead_projects for select using (exists (select 1 from public.leads l where l.id = lead_id and l.company_id = public.auth_company_id()));
create policy lead_projects_write on public.lead_projects for all using (exists (select 1 from public.leads l where l.id = lead_id and l.company_id = public.auth_company_id())) with check (exists (select 1 from public.leads l where l.id = lead_id and l.company_id = public.auth_company_id()));

create policy saved_views_own on public.saved_views for all using (company_id = public.auth_company_id() and (owner_id = auth.uid() or is_shared or public.auth_is_admin())) with check (company_id = public.auth_company_id() and owner_id = auth.uid());

create policy dnc_read on public.dnc_numbers for select using (company_id = public.auth_company_id());
create policy dnc_write on public.dnc_numbers for all using (public.auth_is_manager() and company_id = public.auth_company_id()) with check (public.auth_is_manager() and company_id = public.auth_company_id());

create policy imports_own on public.import_jobs for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

create policy alerts_read on public.alerts for select using (company_id = public.auth_company_id());
create policy alerts_write on public.alerts for update using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());
