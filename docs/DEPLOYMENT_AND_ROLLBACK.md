# Deployment, verification, and rollback runbook

This site is a static HTML/CSS/JavaScript Cloudflare Pages deployment rooted at `develop-with-raman/`, backed by the existing Supabase project. This runbook is deliberately conservative: Git rollback and database rollback are different operations.

## Release principles

- Keep changes on a feature branch until checks pass.
- Use small, logically grouped commits; avoid mixing UI, database schema, and production settings in one commit.
- A green GitHub check means static checks passed; it does **not** prove browser behaviour, RLS correctness, or production deployment.
- Never reset the Supabase project, recreate user tables, or run setup SQL as a rollback.
- Never put a service-role key, database password, or OAuth secret in browser code or Git.
- Treat schema migrations as forward-only unless a specific, reviewed reverse migration is safe for the actual data.

## Change lifecycle

1. **Baseline:** record current production commit, verify the production URL, and note the current Cloudflare Pages deployment.
2. **Branch:** make one focused change on `feature/workflow-overhaul` (or a new feature branch for unrelated work).
3. **Local/static checks:** run `node --check` on changed JavaScript and validate HTML asset references, IDs, and dashboard tab/panel pairs.
4. **Review:** inspect the diff for accidental design changes, duplicate controls, exposed secrets, unsafe `innerHTML`, and role checks used in place of RLS.
5. **Preview:** use a Cloudflare Pages preview deployment when configured; test both desktop and mobile layouts.
6. **Journey tests:** check anonymous enquiry, client login/session restoration, client request submission, update navigation, admin login, and sign-out. Use separate test accounts.
7. **Database checks:** inspect table policies and run Supabase security/performance advisors. Do not apply a policy or migration solely to silence a warning; validate intended access first.
8. **Release:** merge only after blockers are cleared. Confirm Cloudflare Pages deployed the expected commit and test the live URL.
9. **Observe:** check browser console/network errors and Supabase logs after release.

## Rollback procedure

### Static website rollback
1. Stop further merges/deploys while investigating.
2. In GitHub, identify the last known-good production commit and the offending commit(s).
3. Prefer a **revert commit** for a merged change, rather than force-pushing or rewriting `main`.
4. If Cloudflare Pages has a known-good deployment that can be safely redeployed, use the Cloudflare dashboard's deployment rollback/retry controls according to the project's configured production branch.
5. Verify the live URL, sign-in, homepage navigation, and client/admin portals after rollback.
6. Record the cause and add a regression check before retrying.

### Supabase/database rollback
1. Pause the release and preserve the current schema/data state.
2. Inspect the migration that was actually applied and the current database migration history.
3. Prefer a forward-fix migration. A reverse migration can drop data or break newer code; do not run it without a reviewed backup and an explicit impact assessment.
4. Never restore a full database snapshot just to undo a static UI change.
5. Verify RLS with separate client accounts and an admin account after any database repair.

## Required release gates

- [ ] GitHub static-validation workflow is green.
- [ ] No secrets or accidental data changes in the diff.
- [ ] Anonymous visitor can submit an enquiry without seeing client-only data.
- [ ] Client A cannot read or change Client B's projects, requests, messages, files, or invoices.
- [ ] Admin routes and admin data access require a verified admin role.
- [ ] Client notification/update links open the intended dashboard section.
- [ ] Desktop and mobile navigation work; no console errors.
- [ ] Supabase security advisor findings have been triaged, especially policies that unexpectedly allow anonymous access.
- [ ] Cloudflare Pages deployed the expected commit and production smoke tests pass.

## Current project-specific blockers

- Supabase advisors currently report anonymous-role policy access paths on several tables (including deliverables, enquiries, invoices, leads, messages, milestones, profiles, and projects) and overlapping permissive policies. Some may be legitimate policy combinations, but they must be inspected against the actual role/ownership model before being changed.
- The client Updates centre currently derives events from existing records and stores read markers in browser-local storage. It is not yet a durable cross-device notification system or email delivery system.
- Admin analytics/graphs are intentionally a later phase, after client events, data permissions, and metric definitions are validated.

## Safe recovery rule

If a test fails, revert only the most recent focused code change on the feature branch, rerun the checks, and keep production untouched. Never claim a live deployment until Cloudflare confirms the deployment and the production URL is verified.
