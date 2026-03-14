---
name: Security Sweep
description: A comprehensive security audit skill to identify vulnerabilities in the codebase, including RLS policies, function permissions, and sensitive data exposure.
---

# Security Sweep Skill

This skill performs a security audit of the codebase, focusing on:

1.  **Row Level Security (RLS)**: Ensuring all tables have RLS enabled and appropriate policies.
2.  **Function Security**: Checking for mutable search paths in Postgres functions.
3.  **Sensitive Data**: Scanning for hardcoded secrets or exposed API keys.
4.  **Middleware**: Verifying proper authentication checks in middleware.

## Instructions

### 1. RLS Policy Check

- **Goal**: Ensure every table in `public` schema has `ENABLE ROW LEVEL SECURITY`.
- **Action**:
  - Scan `supabase/migrations` and `supabase/schema.sql`.
  - Look for `CREATE TABLE` statements.
  - Verify there is a corresponding `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
  - Verify there are `CREATE POLICY` statements for the table.
- **Remediation**: If missing, generate a migration to enable RLS and add basic policies.

### 2. Function Search Path Check

- **Goal**: specific `search_path` should be set for all `SECURITY DEFINER` functions.
- **Action**:
  - Scan `supabase/migrations` for `CREATE OR REPLACE FUNCTION`.
  - If `SECURITY DEFINER` is present, check if `SET search_path = public` (or other schema) is also present.
- **Remediation**: Add `SET search_path = public` to the function definition.

### 3. Middleware Audit

- **Goal**: Ensure `updateSession` or equivalent is called in `middleware.ts`.
- **Action**: Check `src/middleware.ts` or `src/utils/supabase/middleware.ts`.

### 4. Secret Scan

- **Goal**: No hardcoded secrets.
- **Action**: Grep for `sk_live`, `ey...` (JWT patterns), `postgres://`.

## Supabase Specific Checks (User Request)

- **RLS Disabled in Public**: Check for tables: `subcontractors`, `job_assignments`, `calibration_cycles`, `payments`, `friction_tool_links`, `friction_intervention_links`, `intervention_desire_links`, `process_tool_links`, `engagements`, `owner_desires`, `process_activities`, `tools`.
- **Function Search Path Mutable**: Check functions: `public.update_updated_at`, `public.handle_new_user`.

## Best Practices (Web Standards)

### 5. CORS Configuration

- **Goal**: Ensure CORS does not allow all domains (`*`) in production.
- **Action**: Check `next.config.js` or middleware for CORS headers. Verify `Access-Control-Allow-Origin` restricts to the production domain.
- **Remediation**: Explicitly set the production domain in CORS options.

### 6. Validate Redirects

- **Goal**: Prevent Open Redirect vulnerabilities.
- **Action**: Search for usage of explicit redirect query parameters (e.g., `?redirect=...`) in auth handlers and middleware.
- **Remediation**: Re-verify the domain, or validate redirect destinations against a strict allowlist.

### 7. Storage Bucket Security

- **Goal**: Ensure file upload buckets are not public by default without RLS.
- **Action**: Scan storage bucket configurations or migrations.
- **Remediation**: Apply RLS to the `storage.objects` table allowing users to only `SELECT` or `INSERT` objects where the `auth.uid()` matches the owner.

### 8. Debug Statements Leakage

- **Goal**: Prevent sensitive data leakage through `console.log` in production.
- **Action**: Scan for `console.log` logging sensitive business or user data.
- **Remediation**: Configure the build tool (e.g., Next.js compiler) to `removeConsole` in production, or replace with structured server-side logging.

### 9. Webhook Signature Verification

- **Goal**: Prevent arbitrary execution of webhook endpoints (e.g., Stripe payments).
- **Action**: Scan webhook handlers (e.g., `src/app/api/webhooks/...`). Check if the payload is verified using the provider's SDK (e.g., `stripe.webhooks.constructEvent`).
- **Remediation**: Implement mandatory signature validation before processing the payload.
