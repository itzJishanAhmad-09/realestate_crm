-- Enforce caller's RLS on the aggregate view
drop view if exists public.lead_counts_by_status;

create view public.lead_counts_by_status
with (security_invoker = true) as
select l.company_id, s.id as status_id, s.key, s.label, s.category, s.sort_order,
       count(*)::int as leads
from public.leads l
join public.lead_statuses s on s.id = l.status_id
group by l.company_id, s.id, s.key, s.label, s.category, s.sort_order;

-- Policies below --
