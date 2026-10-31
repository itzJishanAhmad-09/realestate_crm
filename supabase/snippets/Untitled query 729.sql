-- Make the trigger functions run with "system" privileges so they bypass RLS
alter function public.enqueue_lead_automation() security definer;
alter function public.enqueue_site_visit_automation() security definer;
alter function public.enqueue_lead_assigned() security definer;

-- Add a fallback policy to allow inserting into the automation queue
drop policy if exists aq_insert on public.automation_queue;
create policy aq_insert on public.automation_queue for insert with check (true);
