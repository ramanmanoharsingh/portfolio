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

Cloudflare Pages route rewrites are defined in `develop-with-raman/_redirects`. Authentication, callback, client dashboard, profile, admin portal, and password reset pages are separate static files in the same directory.

## Deployment

Cloudflare Pages should deploy the `develop-with-raman/` directory as the site root, with no framework build command required for the static HTML/CSS/JavaScript site. Confirm the Pages project’s configured root directory and production branch before changing deployment settings.

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
- The last homepage patch was committed as [`934698b`](https://github.com/ramanmanoharsingh/portfolio/commit/934698b826954748f24d3e4f5b808192cf896319). Its live behavior still needs verification in Cloudflare Pages and on a phone.
- Supabase's security advisor currently reports leaked-password protection as disabled. Enable it in Supabase Auth settings if supported by the project plan, then test password sign-in and reset flows.

## Change workflow

1. Inspect the current production branch and relevant files.
2. Make a small, scoped change.
3. Review the diff and check for accidental secret exposure.
4. Commit with a specific message.
5. Verify the Cloudflare deployment.
6. Test the relevant flows on desktop and mobile.
7. Re-check Supabase advisors if database/auth configuration changed.
