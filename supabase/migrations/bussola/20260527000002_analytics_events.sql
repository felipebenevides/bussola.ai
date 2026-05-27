-- Bússola — Analytics: telas percorridas + identificação opcional.
-- Cobre login real, onboarding com captura de email/phone, e perfis 100%
-- anônimos (session_id via cookie).

CREATE TABLE IF NOT EXISTS bussola.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid REFERENCES bussola.users(id) ON DELETE SET NULL,
  email text,
  phone text,
  event_type text NOT NULL CHECK (event_type IN ('page_view', 'identify', 'action')),
  path text,
  referrer text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_session
  ON bussola.analytics_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user
  ON bussola.analytics_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_email
  ON bussola.analytics_events(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_path
  ON bussola.analytics_events(path, created_at DESC) WHERE path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_event_type
  ON bussola.analytics_events(event_type, created_at DESC);

ALTER TABLE bussola.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_no_anon" ON bussola.analytics_events;
CREATE POLICY "analytics_no_anon" ON bussola.analytics_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

GRANT ALL ON bussola.analytics_events TO service_role;
