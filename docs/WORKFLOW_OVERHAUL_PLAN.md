# Functional Workflow Overhaul Plan

**Repository:** `ramanmanoharsingh/portfolio`  
**Production branch:** `main`  
**Working branch:** `docs/workflow-overhaul-plan`  
**Application:** Static HTML, CSS, and vanilla JavaScript hosted on Cloudflare Pages; existing Supabase Auth and Postgres backend.

## Mission

Reorganise how the existing website works without redesigning it or rebuilding it from scratch. Preserve the current visual identity, fonts, layouts, sign-in/sign-up pages, dashboards, Supabase project, existing records, and working features. Prefer focused changes to existing files and components.

This plan is not proof that the implementation has already changed. Each stage must be verified against the repository and tested before it is marked complete.

## Guardrails

- Do not replace the Supabase project or run initial setup/reset SQL against live data.
- Do not expose service-role keys, database passwords, OAuth secrets, or other server credentials in browser code or Git.
- Keep database changes additive, reviewed, and backed up where they could affect existing data.
- Do not weaken RLS or grant broad permissions to make a failing feature appear to work.
- Do not treat a frontend-only role check as authorization.
- Do not change the website's aesthetics unless a minimal UI adjustment is required to expose a corrected workflow.
- Do not claim production deployment success from a Git commit alone; verify Cloudflare Pages and the deployed site.
- Work in small commits on a feature branch; merge only after relevant checks pass.

## Confirmed repository context

The repository README states that the site uses static HTML/CSS/vanilla JavaScript, Cloudflare Pages, and Supabase Auth/Postgres. The site source is under `develop-with-raman/`. Existing rewrites include:

- `/auth` and `/login` → `/auth.html`
- `/auth/callback` → `/auth-callback.html`
- `/dashboard/client` and `/client-dashboard` → `/client-dashboard.html`
- `/dashboard/admin` and `/admin` → `/admin-portal.html`
- `/profile` → `/profile.html`
- `/reset-password` → `/reset-password.html`

The existing sign-in page references `/auth.css`, `/portal-supabase.js`, and `/account-auth.js`. Inspect the actual current versions before editing. These observations do not establish that every workflow is currently functioning.

## Target user experiences

### Anonymous visitor

- Browse all intended public pages, projects, and services.
- Submit supported project and service enquiries without creating an account.
- See a clear confirmation after successful submission.
- Never see private client workspaces or admin-only records.
- Anonymous enquiries remain distinct from client-owned request history.

### Registered client

- Sign in or register using the existing authentication pages.
- Return to the intended public page after authentication where appropriate.
- Retain the selected project/service context through the sign-in redirect.
- See the signed-in state reflected in existing navigation and profile controls.
- Access their client workspace through the existing site.
- Submit requests linked to their authenticated Supabase user ID.
- See only the requests/projects their permissions allow them to access.
- Retain normal session persistence, refresh, back-navigation, and sign-out behaviour.

### Administrator

- Continue using the public site when needed.
- Access the protected admin management portal.
- Review anonymous enquiries and registered-client requests.
- Manage projects, services, questions/enquiries, clients, and notifications according to existing capabilities and authorised permissions.
- See analytics calculated from actual data, not placeholder numbers.
- Have administrative authorization enforced by trusted backend/database rules, not a hidden button alone.

## Implementation stages

### Stage 1 — Audit and baseline

1. Inspect the latest `main` tree and recent commits.
2. Map public pages, rewrites, authentication callbacks, client workspace, admin portal, and profile routes.
3. Locate all relevant JavaScript handlers and Supabase queries.
4. Map existing tables, relationships, RLS policies, and trusted admin checks.
5. Record current working and failing behaviour.
6. Identify duplicate implementations only after confirming they are genuinely redundant.
7. Record available test/build/lint commands and establish a safe rollback point.

**Exit criteria:** a file-level map of routes, auth logic, request handlers, database dependencies, and risks exists before functional edits begin.

### Stage 2 — Authentication and routing

1. Centralise or consistently reuse existing session and role-resolution logic.
2. Preserve intended destinations and project/service context during sign-in.
3. Return clients to the main site when that is the expected flow; expose their workspace through navigation rather than forcing every client into a dashboard.
4. Keep the admin portal protected and distinct.
5. Handle expired sessions, failed callbacks, refreshes, direct URLs, and sign-out.
6. Avoid redirect loops and avoid trusting role values supplied by editable user metadata.

**Exit criteria:** anonymous, client, and admin routing behaviour is documented and tested without changing the visual design.

### Stage 3 — Fix “Request Similar Project”

Trace the action from its button through the form, validation, identity resolution, Supabase write, confirmation, and destination.

Check for hardcoded admin identity assumptions, missing project identifiers, incorrect redirects, ownership errors, RLS failures, swallowed errors, and incorrect required fields.

**Exit criteria:** the feature works for every intended role; the persisted record, ownership, confirmation, and visibility are verified.

### Stage 4 — Fix “Discuss This Service”

Trace the same complete path, including service identifier/context, authentication state, submission validation, Supabase operation, and confirmation.

Support anonymous visitors and registered clients without accidentally associating an anonymous enquiry with an arbitrary account.

**Exit criteria:** both anonymous and authenticated submission paths work as intended, and administrator review is verified.

### Stage 5 — Separate request ownership and queues

- Reuse the existing schema if it can safely represent anonymous enquiries and authenticated client requests.
- If schema changes are necessary, document the exact gap and propose a reviewed additive migration.
- Set ownership from the trusted authenticated session/database context, not an untrusted browser-supplied user ID.
- Preserve anonymous records and their contact information as provided.
- Keep client request history private to the owning client and authorised administrators.
- If an anonymous request later becomes associated with a client, use an explicit, verified linking flow.

**Exit criteria:** a request from one client cannot be read or modified by another client; anonymous requests are not incorrectly assigned to a client.

### Stage 6 — Main-site navigation and client workspace

- Preserve existing styles and components.
- Make the signed-in state visible using existing profile/name/avatar patterns where present.
- Expose client workspace links only when appropriate.
- Keep public browsing intact.
- Add concise signup guidance near the existing enquiry flow explaining that an account lets a client save and track request history.
- Ensure signing out restores the anonymous navigation state.

Suggested helper copy: “Create an account to keep your project requests organised, track their status, and access your project history in your client workspace.”

**Exit criteria:** the site behaves consistently before login, after login, after refresh, and after logout on desktop and mobile.

### Stage 7 — Reorganise the administrator dashboard

Reuse current admin components and design. Map current functionality into these logical areas where appropriate:

1. Overview
2. Analytics and trends
3. Anonymous enquiries
4. Registered-client requests
5. Projects
6. Services
7. Clients
8. Questions and other enquiries
9. Notifications/activity
10. Settings

Do not create duplicate screens just to match this list. Consolidate existing screens when safe and preserve all current admin capabilities.

The overview should prioritise pending work, recent activity, request status, service interest, and project progress using verified data. Every metric must have a defined meaning and appropriate loading, empty, and error states.

**Exit criteria:** administrators can find and act on relevant work without losing existing capabilities; summary figures reconcile with underlying records.

### Stage 8 — Request lifecycle and notifications

Reuse current statuses where possible. A target lifecycle may be:

`Received → Under Review → Accepted or Declined`

Accepted requests may proceed to project creation/linking where the current system supports it. Validate status transitions, persist updates, and send only the notifications supported by the existing integration. Do not display a successful status change before the backend confirms it.

**Exit criteria:** request status changes persist and are visible only to permitted users; failures produce useful errors.

### Stage 9 — Security and data checks

Review table grants and RLS policies together. Confirm that policies restrict both operations and row ownership. Check that client updates cannot reassign ownership. Verify role checks use trusted authorization data and that service-role secrets never reach browser code.

Test allow and deny cases for anonymous visitors, clients, and administrators. Do not remove policies just to silence a warning; understand the actual predicate and intended access first.

**Exit criteria:** least-privilege access is demonstrated by positive and negative tests.

### Stage 10 — Regression, release, and verification

Test:
- Signed-out visitor.
- Newly registered client.
- Existing non-admin client.
- Administrator.
- Email/password and Google sign-in independently if enabled.
- Sign-in callback, password reset, session refresh, and sign-out.
- Both request actions for every intended user type.
- Request ownership, anonymous/client separation, status updates, and dashboard visibility.
- Direct-route protection, reloads, back navigation, expired sessions, desktop and mobile layouts.
- Existing public sections, projects, services, and other unaffected features.

Review the diff for accidental aesthetic changes, secrets, destructive SQL, duplicate code, and unrelated modifications. Run available automated checks. Commit logically on a feature branch, open/review a PR if available, and merge only after checks pass. Then verify Cloudflare Pages deployment and test the deployed URL.

**Exit criteria:** relevant tests pass, known limitations are recorded, the change is reviewed, and live deployment is independently verified.

## Working protocol for the implementation chat

1. Report the actual branch and audit findings.
2. Identify the exact files for the next small stage.
3. Make one coherent change at a time.
4. Inspect the diff and run focused checks after each change.
5. Report what changed, what was tested, and what remains unverified.
6. Ask for manual intervention only when a real permission, credential, external setting, or product decision is required.
7. Never claim a commit, merge, test, or deployment succeeded without a confirming tool result.

## Authoritative security reference

Supabase's official guidance explains that table grants and Row Level Security work together: grants determine which operations a role may attempt, while RLS policies restrict which rows are accessible. Policies must be tested for both allowed and denied access.

- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Securing your data](https://supabase.com/docs/guides/database/secure-data)

## Status

- [x] Workflow plan drafted from the repository README and confirmed route/auth file references.
- [ ] Full source and database-policy audit.
- [ ] Authentication/redirect fixes.
- [ ] Request Similar Project fix.
- [ ] Discuss This Service fix.
- [ ] Anonymous/client workflow separation.
- [ ] Admin dashboard reorganisation.
- [ ] Regression and security tests.
- [ ] Reviewed merge and live deployment verification.


## Expanded scope confirmed on 10 October 2026: three major workstreams

The requested implementation has three major workstreams. The client workflow and admin dashboard are the current focus. Preserve all existing visual styling and reuse the current repository; do not create a new repository.

### Workstream A — Client experience and routing

This workstream covers the existing public website, sign-in/sign-up, authenticated navigation, client workspace, anonymous enquiries, project requests, and service enquiries. Follow Stages 2–6 above. Prioritise fixing the two broken request actions before expanding features.

### Workstream B — Administrator dashboard overhaul

Keep the existing admin portal's visual design and its current working features. Its current navigation is limited to Overview, Clients, Projects, and Client preview. The existing page also includes project/milestone management, deliverable upload, invoice creation, and incoming project briefs. Reorganise navigation and sections so the following workflows are discoverable without duplicating or deleting existing capabilities:

1. **Overview** — a real-data summary of client accounts, active projects, pending proposals/enquiries, overdue work, upcoming deadlines, and recent activity.
2. **Project overview** — a dedicated navigation destination showing all projects, client association, status, progress, next milestone, due date, and overdue/blocked indicators. Filters should include status, client, and deadline where supported by available fields.
3. **Questions and feedback** — consolidate the existing questions/enquiries workflow and add a structured feedback mechanism. Feedback entries should capture the relevant question or project/service context, submitted feedback, creation date, status, and optional follow-up owner. Use a small, clear status lifecycle such as New → Reviewed → Follow-up needed → Resolved, adapted to the existing schema. Feedback should be attributable to a user only when authenticated; anonymous feedback must remain anonymous. Do not assume a feedback table exists until the schema audit proves it.
4. **Service usage analytics** — summarise which services receive enquiries, request volume over time, and status/conversion where the data permits. Use a bar chart for comparing service counts and a line chart for time trends only when the underlying data includes reliable service identifiers and timestamps. Label time ranges and denominators; include empty/error states and a readable table fallback. Do not invent service usage metrics from project titles or placeholder data.
5. **Time management** — add a lightweight admin planning area that reuses existing project and milestone records. Show upcoming deadlines, overdue milestones, work awaiting review, and a simple priority/next-action list. If task/time-entry records already exist, audit and reuse them. Do not introduce time tracking, billable hours, or a new task schema until existing data capabilities and the intended workflow have been assessed.
6. **Clients** — retain existing client listing and project/invoice context.
7. **Services** — manage the existing service catalogue if it is stored in the repository or backend; otherwise link to the actual current service source rather than inventing a second catalogue.
8. **Project delivery** — preserve milestones, deliverables, invoices/payment links, and proposal status controls.
9. **Activity/notifications and settings** — add only where existing integrations and schema support them.

### Workstream C — Data model, permissions, and quality

Inspect the existing schema before proposing changes. The current setup SQL defines a `public.leads` table for project enquiries, including optional `user_id`, `project_type`, status, and timestamps; it permits anonymous or authenticated insertion and restricts client reads to their own records, with owner-level access configured separately. Existing migrations also define proposals, invoices, milestones, profile fields, and a profile role guard. This means the audit must reconcile the live/actual schema and all migrations before changing anything.

Important implementation checks:
- The service analytics must be based on a trustworthy service key/name in existing records; identify any historical records without one.
- Time-management indicators should be computed from real due dates and status fields, with a clearly documented definition for overdue/upcoming.
- Feedback questions should be modelled without mixing feedback responses with project leads unless the existing schema explicitly supports that design.
- All client-facing rows must remain isolated by authenticated identity and RLS.
- Admin-only writes must be protected by the existing trusted admin authorization mechanism.
- Never run the starter setup SQL or a destructive migration against production as a shortcut.

## Research-informed design principles

The research is used to inform workflow patterns, not to copy another site's proprietary source code or pretend to have inspected private implementations. Apply these patterns to the current site's constraints:

- A client portal should show status, next action, milestones, and required client decisions from the same underlying project records; avoid a second manually maintained status source.
- Separate internal admin details from client-visible status and deliverables.
- Design dashboard metrics around a decision or action, not around filling space with charts.
- Every feedback item should create a traceable record and a clear next step or resolution state.
- Time management should surface deadlines and blockers first; do not build a full timesheet system unless the existing product needs it.

References consulted:
- [Component.app — Client Portal Workflow for Requests & Approvals](https://www.component.app/blog/client-portal-workflow/) (updated 7 August 2026): action loops, status transitions, evidence, and next owner.
- [Nudge — Client portal for consultants](https://nudge.crmhacker.com/resources/client-portal-for-consultants): concise client-facing actions and visibility boundaries.
- [Cognito Forms — Client project status portal](https://www.cognitoforms.com/support/771/how-to-guides/create-a-client-portal-for-project-status): role-specific views and status tracking.
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): access enforcement at the data layer.

## Updated status

- [x] Confirmed the current app architecture and existing admin navigation/page capabilities from repository files.
- [x] Added the three-workstream scope and requested project overview, feedback, service analytics, and time-management requirements to this plan.
- [ ] Finish audit of request handlers, question/feedback storage, service identifiers, and time-related fields.
- [ ] Implement and test the client workflow repairs.
- [ ] Implement the admin dashboard navigation/sections incrementally.
- [ ] Validate charts and time-management calculations against actual records.
- [ ] Run regression/security checks and verify deployment.


## Implementation log — 10 October 2026

### Verified code change

- Updated `develop-with-raman/projects.html` on `feature/workflow-overhaul` so “Request similar” passes project title, service, and summary to the existing homepage handler at `/?request=1&...`.
- Verified the branch file now points to the homepage enquiry handler and no longer sends this action directly to `/client-dashboard.html`.
- The homepage already contains a request handler that opens the authenticated proposal flow for a recognised client session and the public enquiry form for visitors without a client session.
- Commit: `7b3e628490f7bc0e9d401b36e5cb2141ea95770b`.
- This change has **not** been merged into `main` or verified on the deployed site.

### Audit findings that affect the next steps

- `client-dashboard.html` is explicitly a protected client workspace. `client-portal.js` redirects unauthenticated visitors to the existing auth page and submits registered-client proposals to `public.proposals` with `client_id = user.id`. That is appropriate for client-owned proposals but is not an anonymous submission path.
- The homepage project enquiry form writes to `public.leads`, which already supports anonymous submissions with `user_id = null` and authenticated submissions linked to the session.
- `admin-portal.html` currently has only Overview, Clients, Projects, and Client preview navigation. Its existing sections include project/milestone management, deliverable uploads, invoices/payment links, and incoming project briefs.
- `admin-portal.js` currently queries profiles, projects, proposals, invoices, and milestones. The current setup SQL does not define a dedicated feedback/questions table. No feedback table should be assumed until the complete live schema and migrations are reviewed.
- The leads schema includes `project_type`, status, and timestamps, which can support a provisional service-interest view only if its values are confirmed to represent the service categories consistently. Missing or inconsistent historical values must be reported rather than guessed.
- Project/milestone due dates exist in the current admin code and can support an initial deadline view. A full timesheet or time-entry feature is not yet supported by evidence of an existing time-entry schema.

### Updated task status

- [x] Add expanded three-workstream scope to this plan.
- [x] Make and verify the focused “Request similar” route change on the feature branch.
- [x] Identify the existing public enquiry path and the protected client proposal path.
- [ ] Verify service enquiry handling end-to-end.
- [ ] Complete live schema/RLS audit before adding feedback storage or changing admin data access.
- [ ] Add admin project overview, service analytics, and time-management views using verified fields.
- [ ] Decide and implement the feedback/question persistence workflow after schema review.
- [ ] Run syntax, regression, permission, and deployed-site checks.
