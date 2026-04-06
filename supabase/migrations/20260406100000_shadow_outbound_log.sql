-- Shadow outbound log: captures emails suppressed by silent mode
-- so the daily shadow digest can show what WOULD have been sent.

CREATE TABLE IF NOT EXISTS shadow_outbound_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  source_route TEXT NOT NULL,
  email_type TEXT NOT NULL,
  to_address TEXT NOT NULL,
  cc_address TEXT,
  subject TEXT NOT NULL,
  body_html TEXT,
  attachments_meta JSONB DEFAULT '[]',
  related_job_id UUID REFERENCES jobs(id),
  related_job_number TEXT,
  metadata JSONB DEFAULT '{}',
  suppressed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shadow_outbound_org_date
  ON shadow_outbound_log(organization_id, suppressed_at DESC);

CREATE INDEX idx_shadow_outbound_job
  ON shadow_outbound_log(related_job_id)
  WHERE related_job_id IS NOT NULL;

ALTER TABLE shadow_outbound_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on shadow_outbound_log"
  ON shadow_outbound_log FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their org shadow outbound log"
  ON shadow_outbound_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );
