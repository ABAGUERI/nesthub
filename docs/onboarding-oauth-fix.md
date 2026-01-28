# Onboarding Google OAuth fix

## Root cause
- The OAuth callback could run before a Supabase session was available after the external Google redirect, causing the Edge function call to be skipped or called without a valid access token. As a result, `google_connections` was not always populated when the onboarding page rehydrated its state, so Google appeared disconnected and users were sent back to onboarding.
- The frontend also updated `google_connections` directly, which could fail under RLS or permission constraints, hiding errors from the UI and leaving onboarding incomplete.

## Fix
- Ensure a valid Supabase session is available (or refreshed) before running the OAuth exchange and before rehydrating onboarding state.
- Poll for the Google connection after a successful exchange to reduce race conditions.
- Route Google connection updates (selected calendar + grocery list) through a `SECURITY DEFINER` RPC so the UI does not depend on direct table access.

## How to test
1. Sign up, verify email, and go through onboarding step 1 (family).
2. Connect Google on step 2 and complete OAuth.
3. Confirm:
   - The Edge function `google-oauth-exchange` is called once.
   - The onboarding step shows Google connected without re-entering children.
4. Click “Terminer ✓” and verify:
   - Task lists are created once (idempotent behavior).
   - `profiles.onboarding_completed` becomes `true` and you are redirected to `/dashboard`.
