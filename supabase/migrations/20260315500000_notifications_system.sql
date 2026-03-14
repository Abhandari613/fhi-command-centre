-- Notifications system for Frank's Home Improvement
-- Supports: email surveillance alerts, stale quote warnings, sub photo uploads, etc.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id), -- NULL = org-wide
  type TEXT NOT NULL, -- 'new_job', 'quote_stale', 'sub_photo', 'completion_ready', 'margin_warning', 'review_request', 'email_detected', 'schedule_suggestion'
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}', -- flexible payload (job_id, quote_id, etc.)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_org ON notifications(organization_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org notifications"
  ON notifications FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Also add email_scan_log to track processed emails
CREATE TABLE IF NOT EXISTS email_scan_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  gmail_message_id TEXT NOT NULL UNIQUE, -- Gmail message ID to avoid re-processing
  from_address TEXT,
  subject TEXT,
  classification TEXT, -- 'new_work', 'quote_request', 'job_update', 'irrelevant'
  job_id UUID REFERENCES jobs(id), -- linked job if created/updated
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_scan_gmail_id ON email_scan_log(gmail_message_id);

ALTER TABLE email_scan_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org email logs"
  ON email_scan_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Add saved_sender_rules for known senders
CREATE TABLE IF NOT EXISTS email_sender_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email_pattern TEXT NOT NULL, -- e.g. 'neilh@allprofessionaltrades.com' or '*@allprofessionaltrades.com'
  classification TEXT NOT NULL DEFAULT 'new_work', -- default classification for this sender
  sender_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_sender_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org sender rules"
  ON email_sender_rules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );
