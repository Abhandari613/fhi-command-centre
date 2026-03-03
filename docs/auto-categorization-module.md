# Auto-Categorization Module ("The Clearinghouse")

## Overview
The **Auto-Categorization Module** is a lightweight, "teach-as-you-go" rules engine designed to reduce administrative overhead in financial reconciliation. Instead of requiring users to manage complex rule sets upfront, the system learns from their daily actions.

## Core Philosophy
1.  **Zero Configuration**: No initial setup required.
2.  **Contextual Learning**: When a user manually categorizes a transaction, the system asks if this should be a permanent rule.
3.  **Transparency**: Users can see "magic" happen via a "Auto-Categorize" button, rather than hidden background processes.

## Architecture

### Database Schema
The module requires a single table to store the rules.

```sql
CREATE TABLE IF NOT EXISTS public.finance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    
    -- The "Trigger"
    param_pattern TEXT NOT NULL, -- e.g., "Home Depot"
    match_type TEXT NOT NULL CHECK (match_type IN ('CONTAINS', 'EXACT', 'STARTS_WITH')) DEFAULT 'CONTAINS',
    
    -- The "Action"
    action_category_id UUID REFERENCES public.tax_categories(id),
    
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Server Actions (Backend Logic)

#### 1. `createCategorizationRule(pattern, categoryId)`
*   **Input**: A string pattern (e.g., "Shell") and a target Category ID.
*   **Logic**:
    *   Inserts a new row into `finance_rules`.
    *   (Optional) Immediately runs the rule against pending transactions.

#### 2. `runAutoCategorization()`
*   **Logic**:
    *   Fetches all *active* rules for the organization.
    *   Fetches all *uncategorized* ("INGESTED" or "AMBIGUOUS") transactions.
    *   Iterates through transactions and applies rules (First Match Wins or Priority based).
    *   Updates matched transactions:
        *   `status` -> 'AUTO_CLASSIFIED'
        *   `confidence_score` -> 0.9 (High confidence)
    *   Returns the count of modified transactions.

## Porting Guide (for 613 Physio App)

To port this module to another application:

1.  **Copy Schema**: Execute the SQL above in your Supabase project.
2.  **Copy Actions**: Copy the functions `createCategorizationRule` and `runAutoCategorization` into your server actions file.
3.  **UI Integration**:
    *   In your Transaction List component, add a "Create Rule" prompt after a manual update.
    *   Add a "Magic Wand" button that calls `runAutoCategorization()`.

## Future Enhancements
*   **Regex Support**: change `match_type` to support regex for power users.
*   **Negative Rules**: "If description contains 'Uber' but NOT 'Eats'..."
*   **Split Rules**: Automatically split a transaction by percentage.
