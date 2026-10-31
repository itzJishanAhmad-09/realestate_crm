create or replace function public.increment_lead_call_stats(p_lead_id uuid) returns void language sql security definer set search_path = public as $$ update public.leads set call_attempts = call_attempts + 1, last_contacted_at = now() where id = p_lead_id; $$;
create or replace function public.apply_call_disposition(p_call_id uuid, p_disposition_id uuid, p_notes text default null, p_next_followup_at timestamptz default null, p_site_visit jsonb default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_company uuid := public.current_company_id(); v_uid uuid := auth.uid(); v_call public.calls%rowtype; v_disp public.dispositions%rowtype; v_lead public.leads%rowtype; v_fu_at timestamptz; v_visit_id uuid;
begin
  select * into v_call from public.calls where id = p_call_id and company_id = v_company for update; if not found then raise exception 'call_not_found'; end if; if v_call.agent_id <> v_uid and not public.is_manager() then raise exception 'forbidden'; end if;
  select * into v_disp from public.dispositions where id = p_disposition_id and company_id = v_company and is_active; if not found then raise exception 'disposition_not_found'; end if;
  if v_disp.requires_notes and coalesce(trim(p_notes), '') = '' then raise exception 'notes_required'; end if;
  update public.calls set disposition_id = p_disposition_id, notes = coalesce(p_notes, notes) where id = p_call_id;
  select * into v_lead from public.leads where id = v_call.lead_id for update;
  v_fu_at := coalesce(p_next_followup_at, case when v_disp.default_followup_minutes is not null then now() + (v_disp.default_followup_minutes || ' minutes')::interval else null end);
  update public.leads set status_id = coalesce(v_disp.next_status_id, status_id), next_followup_at = coalesce(v_fu_at, next_followup_at), is_dnc = case when v_disp.code = 'dnc' then true else is_dnc end, last_contacted_at = now() where id = v_lead.id;
  if v_fu_at is not null then insert into public.follow_ups (company_id, lead_id, assigned_to, due_at, status, notes, created_at) values (v_company, v_lead.id, v_call.agent_id, v_fu_at, 'pending', p_notes, now()); end if;
  if p_site_visit is not null then
    insert into public.site_visits (company_id, lead_id, project_id, assigned_to, scheduled_for, duration_minutes, pickup_required, visitors_count, source, created_by, notes) values (v_company, v_lead.id, (p_site_visit->>'project_id')::uuid, coalesce((p_site_visit->>'assigned_to')::uuid, v_call.agent_id), (p_site_visit->>'scheduled_for')::timestamptz, coalesce((p_site_visit->>'duration_minutes')::int, 60), coalesce((p_site_visit->>'pickup_required')::boolean, false), coalesce((p_site_visit->>'visitors_count')::int, 1), 'call', v_uid, p_notes) returning id into v_visit_id;
    insert into public.reminders (company_id, entity_type, entity_id, channel, send_at, payload) values (v_company, 'site_visit', v_visit_id, 'whatsapp', now(), '{"kind":"confirmation"}'), (v_company, 'site_visit', v_visit_id, 'whatsapp', (p_site_visit->>'scheduled_for')::timestamptz - interval '1 day', '{"kind":"reminder_1d"}'), (v_company, 'site_visit', v_visit_id, 'whatsapp', (p_site_visit->>'scheduled_for')::timestamptz - interval '2 hours', '{"kind":"reminder_2h"}');
  end if;
  insert into public.activity_log (company_id, entity_type, entity_id, actor_id, action, meta) values (v_company, 'lead', v_lead.id, v_uid, 'disposition', jsonb_build_object('call_id', p_call_id, 'code', v_disp.code));
  return jsonb_build_object('lead_id', v_lead.id, 'site_visit_id', v_visit_id, 'next_followup_at', v_fu_at);
end $$;
grant execute on function public.apply_call_disposition(uuid, uuid, text, timestamptz, jsonb) to authenticated;
grant execute on function public.increment_lead_call_stats(uuid) to service_role;
