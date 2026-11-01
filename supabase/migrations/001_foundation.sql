ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'channel_partner';

UPDATE users SET role = 'sales_exec'::user_role WHERE role::text = 'sales_executive';

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('companies', 'lead_statuses')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.current_company_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'company_id')::uuid
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = tablename AND column_name = 'company_id'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (company_id = public.current_company_id())',
      t
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_company_status ON leads (company_id, status_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_created ON leads (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads (company_id, assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_follow_ups_open ON follow_ups (company_id, due_at) WHERE done_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calls_lead ON calls (lead_id, started_at DESC);

CREATE OR REPLACE FUNCTION speed_to_lead_median(p_company_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  WITH pairs AS (
    SELECT EXTRACT(EPOCH FROM (c.started_at - l.created_at))::int AS secs
    FROM leads l
    JOIN calls c ON c.lead_id = l.id AND c.direction = 'outbound'
    WHERE l.company_id = p_company_id
      AND l.created_at > now() - interval '30 days'
      AND c.started_at > l.created_at
  )
  SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY secs)::int FROM pairs
$$;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  claims jsonb;
  company uuid;
BEGIN
  SELECT company_id INTO company FROM public.users WHERE id = (event->>'user_id')::uuid;
  claims := event->'claims';
  IF company IS NOT NULL THEN
    claims := jsonb_set(claims, '{company_id}', to_jsonb(company::text));
  END IF;
  RETURN jsonb_set(event, '{claims}', claims);
END $$;
