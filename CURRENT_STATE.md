# Current State Audit — Develop with Raman
**Audited:** 2026-10-11  
**Working branch:** `develop-with-raman`  
**Repository:** `ramanmanoharsingh/portfolio`

## Stack and deployment
- The public website and portal pages are static HTML, CSS, and vanilla JavaScript. No package manifest or frontend build tool is required for the current site files.
- Cloudflare Pages serves the `develop-with-raman/` directory as the site root. The `_redirects` file provides paths for auth, callback, welcome, client dashboard, profile, admin portal, and password reset.
- Supabase provides authentication and Postgres. `portal-supabase.js` initializes a browser client with a publishable key; no service-role secret belongs in frontend code.

## Existing data and portal code
- The existing schema uses `profiles`, `projects`, `leads`, `proposals`, `invoices`, `milestones`, `tasks`, and `deliverables`. The public intake form currently stores enquiries in `leads`; do not create a competing `enquiries` table without a migration plan.
- Separate auth, client dashboard, admin portal, mobile sidebar, and public-intake Edge Function files already exist.
- Additive migrations in the working branch extend the current schema with notifications, client messaging, project updates, feedback/questions, time entries, audit logging, and project-from-lead workflows. The repository alone cannot confirm which migrations are already applied to the live Supabase database.
- Existing project assignment, admin authorization, and client row visibility depend on database policies/functions as well as frontend checks. Policies and grants must be reviewed together before expanding features.

## Existing theme tokens to preserve
- Public page tokens include `--canvas`, `--canvas-inverse`, `--ink`, `--ink-deep`, `--ink-mid`, `--ink-mute`, `--hairline`, `--link-blue`, `--radius-md`, `--radius-pill`, and `--radius-photo`.
- Portal styles currently use `--portal-bg`, `--portal-ink`, `--portal-muted`, `--portal-line`, `--portal-card`, `--portal-accent`, and `--portal-radius`. Any shared controls should map to existing theme values rather than introduce a separate palette.

## Known gaps to verify before calling the platform complete
1. Verify that the service enquiry CTA preselects the intended service and reliably opens/scrolls to the contact form on first click.
2. Verify auth return paths, session persistence, role routing, and sign-out behavior across public, client, and admin pages.
3. Verify Google and GitHub OAuth provider configuration in Supabase; code cannot supply provider credentials.
4. Review RLS policies, grants, security-definer functions, and the public intake rate-limit implementation as one security boundary.
5. Confirm live migration state and deployment status separately from GitHub commits.
6. The requested public section list names “Projects” twice; keep anchor IDs unique if implemented, but recommend renaming the later section to “Testimonials / Feedback.”

## Safe implementation rules
- Preserve existing portfolio content and database records.
- Keep changes on `develop-with-raman`; do not merge into `main`.
- Never commit OAuth secrets, service-role keys, database passwords, or other server credentials.
- Prefer small commits and test each workflow; a successful commit is not proof of a successful production deployment.
