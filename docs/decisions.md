# Architecture & Design Decisions Log

This document tracks significant architectural decisions, security constraints, and technology choices made throughout the lifespan of the `fhi-app` project. It ensures that as the codebase evolves—especially with AI-assisted development—best practices and security requirements remain robust.

## Security Constraints Tracker
*(Added: February 20, 2026)*

As part of the Consultancy Standard v4.0 updates, the codebase was audited against key web security parameters. As of this date, the following features are **not currently implemented**, but if they are added in the future, these constraints **MUST be strictly adhered to**:

### 1. Webhooks (e.g., Stripe, external providers)
- **Constraint**: ANY webhook endpoint introduced must implement cryptographic signature verification using the provider's official SDK (e.g., `stripe.webhooks.constructEvent()`) before any business logic executes. 
- **Reasoning**: Unverified webhooks allow malicious actors to forge events (like fake payment success triggers).

### 2. File Uploads (Supabase Storage)
- **Constraint**: No storage buckets may default to public access for arbitrary uploads. 
- **Reasoning**: All `storage.objects` must be protected by precise Row Level Security (RLS) policies that tie access directly to `auth.uid()`, preventing sensitive client receipts, photos, or documents from being exposed to search engines.

### 3. Open Redirects
- **Constraint**: Authentication flows or multi-step processes must not blindly consume `?redirect=...` URL parameters.
- **Reasoning**: Open redirect parameters are heavily targeted for phishing. All URL redirection must either be re-verified against the application's domain or validated against a strict allowlist.

## Core Architectural Decisions

*(Pending)*
