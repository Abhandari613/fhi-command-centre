-- Security Sweep: Function Hardening Fixes

BEGIN;

-- 1. Securing update_updated_at() with an explicit search path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$;

-- 2. Securing categorize_transactions() by hardening the search path 
-- while maintaining its original business logic and return type!
CREATE OR REPLACE FUNCTION public.categorize_transactions(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := NOW();
    v_match_count INTEGER := 0;
    v_rule RECORD;
BEGIN
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
            AND status IN ('INGESTED', 'AMBIGUOUS', 'AUTO_CLASSIFIED')
            AND (
                (v_rule.match_type = 'CONTAINS' AND description ILIKE '%' || v_rule.param_pattern || '%')
                OR
                (v_rule.match_type = 'EXACT' AND description = v_rule.param_pattern)
                OR
                (v_rule.match_type = 'STARTS_WITH' AND description ILIKE v_rule.param_pattern || '%')
            );
    END LOOP;

    SELECT count(*) INTO v_match_count
    FROM public.finance_transactions
    WHERE organization_id = p_organization_id
      AND status = 'AUTO_CLASSIFIED'
      AND updated_at >= v_start_time;

    RETURN v_match_count;
END;
$$;

COMMIT;
