-- Migration: Finance Automation & Views
-- Description: Adds SQL-based auto-categorization and a reporting view.

BEGIN;

-- 1. Auto-Categorization Function
-- Strategy: Run rules from Lowest to Highest priority. Last match wins.
CREATE OR REPLACE FUNCTION public.categorize_transactions(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := NOW();
    v_match_count INTEGER := 0;
    v_rule RECORD;
BEGIN
    -- Iterate over active rules for the organization, ordered by priority ASC (Low to High)
    -- This ensures higher priority rules overwrite lower priority ones ("Last Write Wins")
    FOR v_rule IN
        SELECT * FROM public.finance_rules
        WHERE organization_id = p_organization_id
          AND is_active = true
        ORDER BY priority ASC, created_at ASC
    LOOP
        UPDATE public.finance_transactions
        SET 
            category_id = v_rule.action_category_id,
            status = 'AUTO_CLASSIFIED',
            confidence_score = 1.0, 
            rationale = 'Matched rule: ' || v_rule.param_pattern,
            updated_at = NOW()
        WHERE 
            organization_id = p_organization_id
            -- Only touch transactions that are open for classification
            -- We include AUTO_CLASSIFIED to allow re-classification if rules change
            -- We exclude CONFIRMED to respect manual user decisions
            AND status IN ('INGESTED', 'AMBIGUOUS', 'AUTO_CLASSIFIED')
            AND (
                (v_rule.match_type = 'CONTAINS' AND description ILIKE '%' || v_rule.param_pattern || '%')
                OR
                (v_rule.match_type = 'EXACT' AND description = v_rule.param_pattern)
                OR
                (v_rule.match_type = 'STARTS_WITH' AND description ILIKE v_rule.param_pattern || '%')
            );
    END LOOP;

    -- Return count of transactions processed in this run
    SELECT count(*) INTO v_match_count
    FROM public.finance_transactions
    WHERE organization_id = p_organization_id
      AND status = 'AUTO_CLASSIFIED'
      AND updated_at >= v_start_time;

    RETURN v_match_count;
END;
$$;

-- 2. Finance Overview View
-- Provides a consistent source of truth for dashboard stats
CREATE OR REPLACE VIEW public.finance_overview 
WITH (security_invoker = true) -- Enforce RLS of underlying tables
AS
SELECT
    organization_id,
    period_id,
    -- Revenue (Income) - Sum identity: transactions are signed (+/-)
    -- Assuming + is Income, - is Expense
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_revenue,
    
    -- Expenses (Outgoing)
    COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) as total_expenses,
    
    -- Net (Profit/Loss)
    COALESCE(SUM(amount), 0) as net_income,
    
    -- Pending Items
    COUNT(CASE WHEN status IN ('INGESTED', 'AMBIGUOUS') THEN 1 END) as pending_review_count,
    
    -- Uncategorized (Critical for "Clean Books" metric)
    COUNT(CASE WHEN category_id IS NULL THEN 1 END) as uncategorized_count

FROM public.finance_transactions
GROUP BY organization_id, period_id;

COMMIT;
