-- Finance Module Schema for FHI App
-- Based on 613-finance-web but adapted for FHI's UserProfile-based RLS

BEGIN;

-- 1. Financial Periods (Tracks backend accounting periods)
CREATE TABLE IF NOT EXISTS public.financial_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    month_date DATE NOT NULL, -- First day of the month (e.g., 2026-02-01)
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED', 'LOCKED')) DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, month_date)
);

-- 2. Tax Categories (Standardized buckets for tax prep)
CREATE TABLE IF NOT EXISTS public.tax_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id), -- Null means system default
    name TEXT NOT NULL,
    description TEXT,
    is_deductible BOOLEAN DEFAULT true,
    posture TEXT CHECK (posture IN ('CONSERVATIVE', 'AGGRESSIVE', 'NEUTRAL')) DEFAULT 'NEUTRAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Statement Uploads (Audit trail of ingested files)
CREATE TABLE IF NOT EXISTS public.statement_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    filename TEXT NOT NULL,
    upload_type TEXT NOT NULL CHECK (upload_type IN ('bank', 'cc', 'manual')),
    statement_period DATE, -- Optional, inferred from file
    record_count INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions (The core ledger)
CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    period_id UUID REFERENCES public.financial_periods(id),
    
    -- Core Data
    transaction_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL, -- Negative = Expense, Positive = Income
    description TEXT NOT NULL,
    raw_description TEXT, -- Original bank text
    source TEXT NOT NULL, -- 'quickbooks', 'csv_upload', 'manual'
    source_id TEXT, -- External ID for deduplication (canonical_id)
    upload_id UUID REFERENCES public.statement_uploads(id),
    
    -- Categorization
    category_id UUID REFERENCES public.tax_categories(id),
    job_id UUID REFERENCES public.jobs(id), -- Link to Context/Job
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('INGESTED', 'AUTO_CLASSIFIED', 'AMBIGUOUS', 'CONFIRMED')) DEFAULT 'INGESTED',
    confidence_score NUMERIC(3,2) DEFAULT 0.0, -- 0.00 to 1.00
    rationale TEXT, -- Why was this categorization chosen?
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, source_id) -- Prevent duplicates
);

-- 5. Categorization Rules (Auto-classification logic)
CREATE TABLE IF NOT EXISTS public.finance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    
    param_pattern TEXT NOT NULL, -- e.g., "HOME DEPOT"
    match_type TEXT NOT NULL CHECK (match_type IN ('CONTAINS', 'EXACT', 'STARTS_WITH')) DEFAULT 'CONTAINS',
    
    action_category_id UUID REFERENCES public.tax_categories(id),
    
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Pattern: organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
-- -----------------------------------------------------------------------------

-- Helper Policy Function (Optional, but strictly following existing pattern inline is safer usually)
-- We will use inline policies to match `restore_core_schema.sql`

-- Periods
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org periods" ON public.financial_periods FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can manage org periods" ON public.financial_periods FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);

-- Tax Categories
ALTER TABLE public.tax_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view system and org categories" ON public.tax_categories FOR SELECT USING (
    organization_id IS NULL OR 
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can manage org categories" ON public.tax_categories FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);

-- Uploads
ALTER TABLE public.statement_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org uploads" ON public.statement_uploads FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can insert org uploads" ON public.statement_uploads FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);

-- Transactions
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org transactions" ON public.finance_transactions FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can manage org transactions" ON public.finance_transactions FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);

-- Rules
ALTER TABLE public.finance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org rules" ON public.finance_rules FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can manage org rules" ON public.finance_rules FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);


-- -----------------------------------------------------------------------------
-- SEED DATA (System Defaults)
-- -----------------------------------------------------------------------------
INSERT INTO public.tax_categories (name, description, is_deductible, posture) VALUES
('Sales / Revenue', 'Income from services and products', false, 'NEUTRAL'),
('Cost of Goods Sold (COGS)', 'Direct material costs for jobs', true, 'NEUTRAL'),
('Subcontractors', 'Payments to trade partners', true, 'NEUTRAL'),
('Advertising & Marketing', 'Ads, website, leads', true, 'NEUTRAL'),
('Meals & Entertainment', 'Business meals (50% deductible)', true, 'NEUTRAL'),
('Automobile Expenses', 'Gas, insurance, repairs', true, 'AGGRESSIVE'),
('Office Supplies', 'Paper, software, small electronics', true, 'NEUTRAL'),
('Rent & Lease', 'Equipment or shop rent', true, 'NEUTRAL'),
('Professional Fees', 'Legal, accounting, consulting', true, 'NEUTRAL'),
('Insurance', 'Liability, WCB', true, 'NEUTRAL'),
('Owner''s Draw', 'Transfer to personal', false, 'NEUTRAL'),
('Bank Fees', 'Service charges', true, 'NEUTRAL')
ON CONFLICT DO NOTHING;

COMMIT;
