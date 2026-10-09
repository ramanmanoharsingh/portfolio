# Develop with Raman — Phase 2 portal setup

## Current implementation

This branch adds a Supabase-backed client portal to the existing Vanilla HTML/CSS/ES modules website. The original homepage auth form now redirects successfully authenticated users to `/welcome.html`; role-based logic routes administrators to `/admin-portal.html` and clients to `/client-dashboard.html`.

- `/auth.html` — email/password login, registration, reset request, password meter, remember-me and Google/GitHub/LinkedIn OAuth entry points.
- `/auth-callback.html` — explicit social-login callback with visible failure states and session verification.
- `/welcome.html` — client onboarding.
- `/client-dashboard.html` — projects, milestones, approvals, private deliverables, invoices and new project briefs.
- `/profile.html` — profile/preferences and password reset.
- `/admin-portal.html` — client list, project progress, milestone creation, private file uploads, invoice/payment-link creation and proposal status management.
- `/reset-password.html` — completes the password recovery flow.
- `_redirects` — short routes such as `/auth`, `/welcome`, `/dashboard/client`, `/dashboard/admin` and `/profile`.
- `_headers` — baseline security headers and no-index headers for portal pages.

The frontend uses the public Supabase publishable key. **Never place a service-role key, database password or OAuth client secret in the browser or repository.** Database RLS and Storage policies are the actual security boundary; client-side route guards are only UX.

## Database changes already applied

The connected Supabase project has migrations for profile fields and role escalation protection, proposals, invoices, milestone approval compatibility, profile self-service, and a private `client-deliverables` Storage bucket. SQL snapshots are documented under `develop-with-raman/migrations/`.

The private Storage bucket accepts PDF, PNG, JPEG, WebP, ZIP and plain-text files up to 50 MB. Clients receive short-lived signed URLs only for files attached to their own projects. Project and invoice management remains admin-only through RLS.

## Required deployment and provider configuration

1. Confirm the Cloudflare Pages project publishes the `develop-with-raman` directory as its output/root directory so `_redirects`, `_headers`, and the HTML files are served at the domain root.
2. In Supabase → Authentication → URL Configuration, set Site URL to `https://ramans.pages.dev` and allow these redirect URLs: `https://ramans.pages.dev/auth-callback.html`, `https://ramans.pages.dev/welcome.html`, `https://ramans.pages.dev/reset-password.html` (or `https://ramans.pages.dev/**`). Add your local development URL only if needed.
3. In Supabase → Authentication → Sign In / Providers, enable Email. Test email confirmation and password recovery delivery.
4. **Google requires one manual setup step in Google Cloud:** create an OAuth client of type Web application; set Authorized JavaScript origins to `https://ramans.pages.dev`; set its Authorized redirect URI to `https://nmqntqxvficakxkticxc.supabase.co/auth/v1/callback` (the Supabase Auth callback, not the website callback); then copy the Google Client ID and Client Secret into Supabase → Authentication → Sign In / Providers → Google and enable the provider. Keep the client secret only in Supabase, never in website files or GitHub. The same principle applies to GitHub/LinkedIn: their provider callback must be the Supabase `/auth/v1/callback` URL shown in the provider settings. Buttons cannot activate providers until these credentials are configured.
5. Confirm the intended owner profile has `profiles.role = 'admin'`. New registrations are always created as `client`; users cannot promote themselves. Role changes should be performed only through a trusted administrator/database console.
6. In Supabase Auth security settings, enable leaked-password protection. The latest security advisor reported that this protection is currently disabled.
7. Run the acceptance checklist below against the deployed domain before merging the pull request.

## Acceptance checklist

- [ ] Google OAuth opens the provider consent flow, returns to `/auth-callback.html`, creates/verifies a session, and routes to `/welcome.html`.
- [ ] Disabled/misconfigured OAuth displays a useful error instead of silently returning to the homepage.
- [ ] A new registration receives a client profile; user-controlled metadata cannot assign the admin role.
- [ ] Sign-in from the homepage redirects to the onboarding page, then the correct role-specific portal.
- [ ] Invalid sessions are sent to the auth page; sign-out invalidates the local session.
- [ ] A client can read only their own projects, invoices, proposals, milestones and deliverables.
- [ ] A client can approve only a milestone submitted for approval, not edit its other fields.
- [ ] An admin can update project status/progress, create milestones, upload private deliverables, create invoices and update proposal status.
- [ ] Password reset completes on `/reset-password.html`.
- [ ] OAuth providers work only after provider setup; unconfigured providers show an understandable error.
- [ ] Mobile layouts, print invoice summary, file upload restrictions and signed URL expiry are tested.

## Known boundaries

- The portal does not charge cards itself. An admin can attach a payment URL from a payment provider; webhook-backed payment reconciliation has not been implemented.
- The website is static. Server-only actions must live in Supabase/Postgres or a trusted server/edge function, never in browser JavaScript.
- Automated browser end-to-end testing and live OAuth/payment-provider testing have not yet been run.
