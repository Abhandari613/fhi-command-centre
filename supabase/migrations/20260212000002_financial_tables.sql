-- Financial Periods (for reporting)
CREATE TABLE financial_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL, -- e.g., "Jan 2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Transactions (Bank Feeds & Manual Entry)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL, -- Negative for expense, Positive for income
    description TEXT NOT NULL,
    merchant TEXT,
    
    -- Categorization & Assignment
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL, -- FK to categories
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL, -- Nullable (overhead isn't job-specific)
    
    -- Status
    status TEXT CHECK (status IN ('pending', 'posted')) DEFAULT 'posted',
    review_status TEXT CHECK (review_status IN ('unreviewed', 'reviewed', 'disputed')) DEFAULT 'unreviewed',
    
    -- Bank Feed Metadata
    external_id TEXT, -- Bank's transaction ID
    bank_account_mask TEXT, -- e.g., "...1234"
    
    receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL, -- Link to source receipt
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view periods in own org" ON financial_periods
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view transactions in own org" ON transactions
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
