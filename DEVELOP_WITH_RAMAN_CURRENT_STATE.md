# Develop with Raman — Current State Audit
Audit date: 2026-10-11
Branch audited: `develop-with-raman` (no changes to `main`)

## Stack and hosting
- Static HTML, CSS, and vanilla JavaScript; no package.json/build tool is present in the audited app folder.
- Cloudflare Pages static hosting with `_redirects` and `_headers`.
- Supabase project `nmqntqxvficakxkticxc` (active, ap-southeast-2); browser config uses the publishable key in `develop-with-raman/portal-supabase.js`.
- Supabase Edge Functions: none currently deployed.
- Existing theme tokens in the public page include `--canvas`, `--canvas-inverse`, `--ink`, `--ink-mid`, `--hairline`, `--radius-pill`, and `--ease`. Portal styles use `--portal-bg`, `--portal-ink`, `--portal-muted`, `--portal-line`, `--portal-card`, and `--portal-accent`.

## Existing routes and auth
- Public page: `/index.html` (served as `/` by Cloudflare Pages from the app directory).
- Account access: `/auth.html`, with `/auth` and `/login` rewrites.
- Callback: `/auth-callback.html`, with `/auth/callback` rewrite.
- Client pages: `/welcome.html`, `/client-dashboard.html`, `/profile.html`.
- Admin page: `/admin-portal.html`, with `/admin` and `/dashboard/admin` rewrites.
- Supabase email/password and Google/GitHub social buttons are handled by `account-auth.js`; callback handling is in `auth-callback.js`. Social provider credentials and allowed callback URLs remain Dashboard configuration, not code.
- The existing trusted admin check is database-side through `private.is_admin()`, which checks the protected `profiles.role` value. A trigger prevents non-admin profile role escalation. This is currently a database profile-role model rather than the requested `app_metadata` model; do not switch without an explicit migration plan.

## Existing database
- Existing tables include `profiles`, `leads`, `enquiries`, `projects`, `milestones`, `tasks`, `messages`, `deliverables`, `proposals`, and `invoices`.
- RLS is enabled on these tables and policies are present. `leads` is the current public/client enquiry store; `enquiries` is a separate legacy store. Avoid creating a third duplicate intake table.
- Current `leads` columns include name/email/contact, project type, budget, deadline, payment preference, description, status, user_id, client_email, and timestamps. It does not yet have `submitter_type`, `project_id`, or a separate immutable content/status model.
- Existing chat is project-scoped via `messages(project_id, sender_id, body, created_at)`; it is not yet a dedicated per-client thread model.
- There are no deployed Supabase Edge Functions at audit time.

## Findings / implementation decisions
1. The public page is a large single HTML file (about 1.81 MB) with inline CSS and JavaScript. Use Git Data API for changes to this file if the Contents API rejects its size.
2. The public form has both a legacy Firestore-style submit handler and a newer Supabase `submitLead` handler. The legacy handler attempts to use an unset `DB` object and falls back to mailto; remove that competing handler so the Supabase path owns submission.
3. The service cards currently use `.lk` buttons while primary actions use `.btn`; align service actions with existing `.btn` variants without changing tokens or overall appearance.
4. The app currently contains both the inline homepage account/dashboard UI and a standalone `auth.html` flow. Preserve these until routing behavior is reconciled; avoid introducing a second router.
5. Security advisors currently flag disabled leaked-password protection and multiple permissive policies. Review exact policies before changing them; do not weaken row-level restrictions to silence lint warnings.
6. No changes to production database schema or provider configuration are made by this audit commit.
