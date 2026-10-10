# Develop with Raman

Static portfolio and freelance-service website for **Develop with Raman**, hosted on Cloudflare Pages and backed by the existing Supabase project.

- **Live site:** https://ramans.pages.dev
- **Repository:** https://github.com/ramanmanoharsingh/portfolio
- **Site source:** `develop-with-raman/`
- **Stack:** HTML, CSS, vanilla JavaScript, Cloudflare Pages, Supabase Auth and Postgres
- **Authentication goal:** email/password and Google OAuth
- **Client access:** invite clients after a project is accepted

## Safe maintenance rules

- Preserve existing Supabase Auth users, profiles, projects, enquiries, and all other records.
- Do not create a replacement Supabase project or run the initial setup SQL against the live database as a reset.
- Do not put a Supabase service-role key, database password, OAuth client secret, or other server secret in browser code or Git.
- The browser-safe Supabase publishable/anon key may be used in the frontend; row-level security (RLS) must enforce authorization.
- Apply database changes only as reviewed, additive migrations. Back up data before any operation that could alter or remove it.
- Test authentication, redirects, mobile navigation, and client/admin access before calling a deployment production-ready.

## Site routes

Cloudflare Pages route rewrites are defined in `develop-with-raman/_redirects`. Use one canonical authentication flow:

- `/auth.html` — the single sign-in, account-creation, and password-reset request page.
- `/auth-callback.html` — OAuth and email-confirmation callback.
- `/welcome.html` — authenticated, role-aware entry point; administrators are routed to the admin portal.
- `/client-dashboard.html` — client project, milestone, deliverable, proposal, and billing workspace.
- `/admin-portal.html` — administrator workspace for clients, website enquiries, project leads, projects, milestones, deliverables, proposals, and invoices.
- `/profile.html` — account details and security settings.
- `/reset-password.html` — password reset completion.
- `/dashboard.html` — legacy sign-in URL that forwards to `/auth.html` (or the password-reset completion page for old recovery links).
- `/dashboard` — compatibility route to the role-aware workspace at `/welcome.html`.

Google and email/password are the current sign-in methods. GitHub and Microsoft/Azure OAuth are intentionally deferred until the Supabase providers and their OAuth credentials/redirect URLs are configured and tested.

## Release smoke-test checklist

Before calling a release production-ready, verify the live Cloudflare Pages deployment—not just the GitHub commit:

1. Homepage navigation and the header sign-in action work on desktop and mobile.
2. Email/password sign-in, sign-up/email confirmation, Google OAuth, sign-out, and password reset each complete the correct redirect.
3. A signed-in client reaches only their own client workspace and records; an administrator reaches the admin portal.
4. A client can submit a project brief and see only their own projects, milestones, deliverables, proposals, and invoices.
5. The administrator can load client/project data, update a project and milestone, manage proposals/invoices, and upload a private deliverable.
6. Private deliverables are opened using expiring signed URLs; role enforcement remains in Supabase RLS, not only frontend checks.
7. No JavaScript console errors, broken route loops, duplicate sign-in surfaces, or mobile overflow remain.

## Data model notes

The connected database currently has both `public.enquiries` and `public.leads`, with different columns and status values. The admin workspace displays both queues so submissions are not hidden. Do not merge or drop either table until the public form destinations and any existing integrations have been verified; keep any eventual consolidation as a reviewed, additive migration.

The current database audit found row-level security enabled on every table in the `public` schema. Admin access is checked through the private `private.is_admin()` helper and profile role, while client reads are scoped by user/project ownership. The Supabase advisors still report policy-overlap and unused-index notices; review these against actual policy predicates and query history before changing production policies or removing indexes.

## Database migrations

Reviewed schema changes are tracked under `supabase/migrations/`. The latest additive migration, `20261010080526_enforce_portal_data_integrity.sql`, is applied to the connected Supabase project. It enforces that an invoice's selected project belongs to the same client and adds database constraints for project/milestone progress (0–100), non-negative invoice amounts, and non-negative optional proposal budgets. The preflight audit found no existing rows that violate these rules.

Keep the migration filename/version aligned with the Supabase migration history. Do not replay the initial setup SQL against production or make schema changes outside reviewed migrations.

## Deployment

Cloudflare Pages should deploy the `develop-with-raman/` directory as the site root, with no framework build command required for the static HTML/CSS/JavaScript site. Confirm the Pages project’s configured root directory and production branch before changing deployment settings.

A dependency-free static audit is available at `scripts/check-site.mjs` and is wired into `.github/workflows/site-check.yml`. It checks JavaScript syntax, duplicate HTML IDs, local asset references, required account pages, redirect targets, and that `auth.html` remains the single canonical account form. These automated checks complement—but do not replace—live OAuth, Supabase authorization, mobile-browser, and Cloudflare deployment smoke tests.

After a commit reaches the configured production branch, check the Cloudflare Pages deployment status and test the deployed URL. A GitHub commit alone does not prove that the live site has updated.

## Supabase checks

The live project already contains application tables for profiles, projects, leads, enquiries, milestones, tasks, messages, invoices, proposals, and deliverables. Preserve these tables and their data.

Before changing database security:
1. Review each RLS policy's target roles and predicates.
2. Verify that clients can only read records associated with their own user/project.
3. Verify that admin-only changes require the server-validated admin predicate.
4. Keep guest enquiry submission narrowly scoped to inserts; do not grant anonymous users broad read/update/delete access.
5. Re-run the Supabase security and performance advisors after a reviewed migration.

The Supabase advisor may flag policies that intentionally apply to the `authenticated` role alongside anonymous-insert policies. Review the actual policy role list and predicate before modifying a policy; do not remove policies solely to silence a warning.

## Authentication configuration

In Supabase Authentication settings, configure the production site URL as `https://ramans.pages.dev` and allow only the required callback/redirect URLs for this domain and any active preview domain. Google OAuth must also be configured with the matching Supabase callback URL in the Google provider console.

Email/password and Google sign-in should be tested independently. Never rely on a frontend-only role check to protect the admin dashboard; authorization must be enforced by Supabase RLS and trusted database functions.

## Current known maintenance notes

- Keep the homepage as the root landing page; avoid persistent section hashes or scroll-restoration behavior that unexpectedly opens the page midway down.
- Ensure the mobile navigation visibly exposes the sign-in action.
- The latest focused homepage sign-in cleanup is [`e4a1bc8`](https://github.com/ramanmanoharsingh/portfolio/commit/e4a1bc8b02360dac770b55ecb627097ce2660e66); the mobile About-section restoration is in [`c189dfacee5f`](https://github.com/ramanmanoharsingh/portfolio/commit/c189dfacee5f49d7214402db1762426593ca45ca). Static HTML checks now pass, but the About section, header spacing, and auth flow still need a live mobile/desktop browser smoke test.
- Supabase's security advisor currently reports leaked-password protection as disabled. Enable it in Supabase Auth settings if supported by the project plan, then test password sign-in and reset flows.

## Change workflow

1. Inspect the current production branch and relevant files.
2. Make a small, scoped change.
3. Review the diff and check for accidental secret exposure.
4. Commit with a specific message.
5. Verify the Cloudflare deployment.
6. Test the relevant flows on desktop and mobile.
7. Re-check Supabase advisors if database/auth configuration changed.
