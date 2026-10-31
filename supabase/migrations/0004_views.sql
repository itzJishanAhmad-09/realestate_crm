create or replace view public.lead_counts_by_status as
select l.company_id, s.id as status_id, s.key, s.label, s.category, s.sort_order,
       count(*)::int as leads
from public.leads l
join public.lead_statuses s on s.id = l.status_id
group by l.company_id, s.id, s.key, s.label, s.category, s.sort_order;

create or replace function public.sweep_speed_to_lead()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select l.id, l.company_id, l.name, l.phone, c.speed_to_lead_minutes
    from public.leads l
    join public.companies c on c.id = l.company_id
    join public.lead_statuses s on s.id = l.status_id
    where s.key = 'new'
      and l.assigned_at is not null
      and l.last_activity_at = l.created_at
      and l.created_at < now() - (c.speed_to_lead_minutes || ' minutes')::interval
      and not exists (
        select 1 from public.alerts a
        where a.lead_id = l.id and a.kind = 'speed_to_lead' and a.resolved_at is null
      )
  loop
    insert into public.alerts(company_id, lead_id, kind, title, body, target_role)
    values (r.company_id, r.id, 'speed_to_lead',
            'Untouched lead: ' || r.name,
            'Phone ' || r.phone || ' untouched > ' || r.speed_to_lead_minutes || ' min',
            'team_leader');
  end loop;
end $$;

do $do$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron not available: %', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.schedule('speed_to_lead_sweep', '* * * * *', 'select public.sweep_speed_to_lead()');
    exception when others then
      raise notice 'Could not schedule speed_to_lead_sweep: %', sqlerrm;
    end;
  end if;
end
$do$;

-- Policies below --
