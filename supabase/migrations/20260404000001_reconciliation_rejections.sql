-- Table to track rejected reconciliation matches so they won't be re-proposed
CREATE TABLE IF NOT EXISTS reconciliation_rejections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    receipt_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (receipt_id, transaction_id)
);

ALTER TABLE reconciliation_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage rejections for their org" ON reconciliation_rejections
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );
