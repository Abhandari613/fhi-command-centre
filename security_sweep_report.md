## Security Sweep — 2026-03-14

Git Tracking:   CLEAN ✓  (no .env files tracked by git)
Staged Secrets: CLEAN ✓  (no staged diff; no JWT / Stripe / Slack / Google / service_role literals found in src/)
NEXT_PUBLIC_:   CLEAN ✓  (all NEXT_PUBLIC_ references read from process.env — no hardcoded values)
.gitignore:     HEALTHY ✓  (.env* rule present; no merge conflicts)

### NEXT_PUBLIC_ vars in use
| Variable | Role |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL (public, safe) |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key (public, safe) |
| NEXT_PUBLIC_APP_URL | Base URL for internal API calls (public, safe) |
| NEXT_PUBLIC_SITE_URL | Auth redirect base URL (public, safe) |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | Maps embed key (public, should be restricted by referrer in GCP console) |

None of the above expose private credentials. The Google Maps key is client-visible by design — ensure it is restricted to your production domain in the GCP console if not already done.

Overall: SAFE TO COMMIT ✓
