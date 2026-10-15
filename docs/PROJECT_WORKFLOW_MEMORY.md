# Develop with Raman — Project Workflow Memory

**Repository:** https://github.com/ramanmanoharsingh/portfolio  
**Production branch:** `main`  
**Live site:** https://ramans.pages.dev  
**Site source / Cloudflare Pages root:** `develop-with-raman/`  
**Stack:** static HTML, CSS, vanilla JavaScript, Cloudflare Pages, Supabase Auth and PostgreSQL

This file consolidates decisions and requirements gathered across previous project conversations. Treat it as the current product/workflow brief; confirm the live code before assuming any feature is fixed or deployed.

## Working rules

- Work directly on `main`; the user explicitly prefers no branches or pull requests for this ongoing cleanup.
- Make focused, reviewable commits with clear messages. Do not force-push or overwrite unrelated work.
- Preserve the existing working homepage and design language: fonts, colors, spacing, shapes, theme tokens, page content, and interactions. Avoid a redesign or rebuilding from scratch.
- Keep the backend simple and reuse the existing Supabase project/schema where safe.
- Preserve all existing Auth users, profiles, projects, enquiries/leads, and other records.
- Never run starter/setup SQL as a live reset. Do not drop tables, wipe records, or weaken row-level security to make a feature appear to work.
- Never commit Supabase service-role keys, database passwords, OAuth client secrets, or other server secrets.
- Do not delete files merely because they look old, duplicated, or unused. First search references from HTML, CSS, JS, redirects, workflows, imports, and deployment configuration. Remove only confirmed-unreferenced files in small reviewed batches.
- A Git commit is not proof of a successful Cloudflare deployment. Verify the deployment and test relevant production flows.
- Avoid introducing new frameworks, dependencies, design systems, or duplicated implementations without a clear need.

## Role-based product workflow

### 1. Anonymous visitor
- Can browse the public homepage, portfolio/projects, and services.
- Can choose a service or request a similar build and submit a public enquiry.
- Receives clear validation and a success/error confirmation.
- Does not get access to client workspaces, private project data, or administrator records.
- Anonymous enquiries remain separate from authenticated client request history unless an explicit verified linking flow is implemented.
- Remove obsolete payment promises/fees from anonymous enquiry messaging where the current product requirements say no payment is taken at enquiry stage.

### 2. Registered client
- Uses the existing sign-in page and supported auth providers.
- Can browse the public website after sign-in; the site should reflect signed-in identity and expose workspace navigation instead of forcing every action into a redirect.
- “Discuss this service” and “Request similar build” preserve service/project context and open the correct enquiry/request path.
- Requests submitted while authenticated are associated with the actual signed-in user, not an arbitrary ID from the browser.
- Client workspace shows the client's own requests and permitted projects, status, milestones, deliverables, updates/notifications, profile, and relevant invoice information.
- Refresh, direct navigation, session restoration, browser back/forward, and sign-out must work predictably.
- User name and photo/avatar should be shown where appropriate; never expose a raw user ID as a display label.
- Sign-out control, top bar, buttons, and dashboard structure should remain consistent with the main site's UI.
- Do not show billing/payment language where it is not relevant to an enquiry.

### 3. Administrator
- Uses a separate protected admin portal.
- Can review public enquiries and client requests, manage projects/statuses, and review questions/feedback.
- Future areas may include service-use trends/graphs and time-management tools; do not fabricate analytics or present placeholder numbers as real data.
- Enforce permissions through Supabase RLS and trusted database-side checks. Hiding a button or checking editable frontend metadata is not authorization.
- Do not route ordinary clients to admin pages due to a profile/settings link or a failed role lookup.

## Intended site information architecture

### Public site
1. Home / introduction
2. About
3. Services
4. Projects / portfolio
5. Contact / enquiry form

The user's latest ordering preference is to keep Projects and Services above the Portfolio label/section where the existing page structure makes that distinction relevant. Preserve the actual current homepage content while adjusting only targeted ordering and workflow issues.

### Authentication
- `/auth.html` (also friendly routes such as `/auth` and `/login`)
- Auth callback page / `/auth/callback`
- Password reset page / `/reset-password`
- Existing Google and email/password sign-in must remain functional.
- GitHub and Azure providers are desired additions only after provider settings and redirect URIs are correctly configured. Apple sign-in was requested to be removed for now.
- Provider enablement and OAuth redirect URI association are configuration tasks in Supabase/provider consoles; code alone cannot enable an external provider or register its callback URI.
- Do not add a theme toggle to the auth page if the latest auth-page requirement still applies.

### Client workspace
- `/client-dashboard.html`: main client workspace with overview, projects/milestones, requests, updates/notifications, and relevant account/billing areas.
- `/welcome.html`: optional onboarding entry point, not a competing second dashboard.
- `/profile.html`: client profile/account settings.
- Keep the dashboard's HTML/layout and common controls aligned with the intended shared workspace shell; avoid separate competing dashboard systems unless each has a clearly documented purpose.

### Admin workspace
- `/admin-portal.html`: protected admin portal, distinct from the client workspace.
- Logical areas: overview; projects/status; anonymous enquiries; client requests; questions/feedback; analytics based on real data; future time-management area.
- Preserve existing functionality and access controls while reorganizing navigation.

## Visual and interaction consistency

- Keep the existing near-black dark theme and current light theme, with shared theme state across applicable pages.
- Maintain one consistent top bar and button language across public pages, auth-adjacent pages, and workspaces.
- Avoid overlapping “Back to website” / theme controls, duplicated home links, inconsistent sign-out buttons, redundant contact/WhatsApp blocks, and cursor-circle effects.
- Keep the auth page clean and visually related to the dashboard without introducing a new palette or style.
- Do not reintroduce removed pricing/package cards or service prices unless the user explicitly requests them.
- Avoid unnecessary footer links beneath the contact area and obsolete project portal links.
- Ensure mobile navigation visibly exposes the correct sign-in/account action.

## Safe engineering and data rules

- Review existing schema, migrations, and RLS policies before touching database logic.
- Prefer the existing `public.leads` workflow where it can safely support enquiries; do not assume the starter SQL fully represents the live database.
- Guest submissions should be narrowly allowed to insert and must not gain broad read/update/delete access.
- Client reads must be restricted to the authenticated owner; admin operations must use trusted authorization.
- If an anonymous enquiry is later attached to an account, require an explicit verified association.
- Surface actionable errors instead of swallowing failures or redirecting indefinitely.
- Use same-site/internal route rewrites where appropriate and validate redirect destinations to prevent loops/open redirects.

## Cleanup and audit order

1. Capture the current `main` commit and map the deployed root, redirects, pages, scripts, styles, and workflow files.
2. Inventory files and references. Mark each as active, legacy-but-referenced, duplicate candidate, or confirmed unused.
3. Audit auth/session/role resolution and redirects before modifying portal navigation.
4. Trace each enquiry action end-to-end: click → context → validation → Supabase write → ownership → confirmation → client/admin visibility.
5. Check dashboard, profile, and admin links against actual roles.
6. Standardize shared top bar, theme, buttons, and sign-out only where it does not change intended page behavior.
7. Add or improve automated static checks; run them after each focused change.
8. Delete only confirmed-unused files, in small batches, after checking route rewrites, dynamic filenames, CSS/JS references, GitHub Actions, and Cloudflare configuration.
9. Review diffs and secret exposure; commit directly to `main` using a specific message.
10. Verify Cloudflare Pages deployment and test anonymous, client, and admin flows on desktop and mobile.

## Known audit concerns from previous reviews

These are leads to re-check against the current `main`, not assertions that the current deployment still has each defect:

- Multiple dashboard-like pages exist; identify their intended roles before merging/removing anything.
- Redirect loops previously affected `/auth.html` and `/client-dashboard.html`.
- GitHub OAuth previously returned “Unsupported provider: provider is not enabled” and “The redirect_uri is not associated with this application.” Check provider enablement, GitHub OAuth app callback URL, Supabase callback URL, and allowed site redirects separately.
- Previous reviews flagged an admin RPC permission concern, possible mismatch between starter SQL and live schema/migrations, and a very large embedded base64 homepage asset.
- Desktop/mobile navigation and top-bar/sign-out consistency have regressed during earlier cleanup attempts.
- Static checks do not replace real browser testing of Supabase session and role behavior.

## Definition of done

A change is complete only when:
- the intended behavior is confirmed in the code and relevant tests pass;
- no unrelated homepage content or working auth flow was removed;
- data access remains protected and existing records are preserved;
- obsolete files are removed only with reference evidence;
- the commit is visible on `main`;
- deployment and the affected live flow have been checked, or the remaining verification gap is stated clearly.
