# Develop with Raman — Client Conversion and Enquiry Workflow

## Implementation brief

Treat this document as the acceptance criteria for the homepage and client enquiry workflow. Inspect the existing implementation and Supabase schema before further edits. Keep the current HTML/CSS/vanilla JavaScript + Cloudflare Pages + Supabase stack. Preserve working authentication, Google and email/password sign-in, profile photo/name, admin portal, client dashboard, and the existing design. Never rewrite or force-push `main`; work on `feature/client-enquiry-conversion` until the changes are tested and reviewed.

## Homepage ordering

- Keep the Services and Projects/Selected Work sections ahead of the portfolio showcase.
- Make the portfolio/selected-work showcase the last main showcase section before direct Contact/footer content.
- Keep section IDs, in-page links, mobile navigation, keyboard navigation, and scroll offsets consistent.
- Do not duplicate sections or remove existing content.

## Client-first conversion flow

1. Every “Start a Project” CTA should lead to Services first.
2. Every service card should offer a service-specific enquiry action that selects/prefills that service in the shared project enquiry form.
3. Visitors can still submit a custom enquiry when none of the listed services fits.
4. Keep a sign-in/client-dashboard action and a direct “Email Raman” alternative near the project form’s submit button.
5. Keep the form approachable, accessible, responsive, and clear about what happens after submission. Do not require unnecessary fields.

## Authentication and routing logic

### Signed-in client flow — authoritative behaviour
1. Every “Start a Project” CTA lands on the Services section first, not on a submission form or directly in a dashboard.
2. For an authenticated client, hide the public homepage “Project enquiry” form so there is only one signed-in submission surface. Do not delete the public form for signed-out visitors.
3. When the authenticated client selects a service card, route to `/client-dashboard.html?request=1&service=<URL-encoded-service-name>`. The client dashboard must open its existing “New project request” modal and preselect that exact service.
4. Reuse the existing `public.proposals` table and dashboard form. Persist the selected service in the proposal title/description using fields supported by the current schema; do not assume a `service_type` column exists unless a reviewed migration is added and applied.
5. Set `client_id` only from the verified Supabase session user ID in the dashboard. Do not trust a client ID from query parameters or local/session storage.
6. A signed-in service request must be submitted through the client dashboard. Do not also insert it into `public.leads`, and do not create duplicate rows in `leads` and `proposals`.
7. After Supabase confirms the proposal insert, route to the dashboard’s “Project requests” tab and display the database-backed request. On failure, keep the modal/draft available, display an accessible error, and do not claim success.
8. If the role lookup fails for an authenticated session, do not silently fall back to anonymous lead submission. Fail safely toward the authenticated workspace and surface recoverable errors.
9. Admin users must retain their existing admin workflow; do not hide the homepage form or route them into the client-only flow when the verified profile role is `admin`.

### Signed-out visitor flow
- Visitors can browse Services and submit the public homepage enquiry if no listed service fits or they are not signed in.
- Selecting a service prefills the public form and moves the visitor to it.
- The public form continues to create a `public.leads` record under the existing insert policy. It must not pretend an anonymous lead is already in a client dashboard.
- Keep the sign-in/client-dashboard action and direct “Email Raman” alternative near the public form submit action.
- Preserve draft fields temporarily. If a session is established before a public form is submitted, transfer the draft and selected service into the client dashboard proposal modal rather than inserting a duplicate lead.

### Post-authentication routing
- If a user starts a project while signed out, preserve the requested return route and draft through email/password and Google sign-in.
- After authentication, return the user to Services first when that was the initiating action. They must explicitly select the desired service before the dashboard request modal opens.
- Validate any post-auth redirect against an allowlist of internal routes; never trust an arbitrary user-supplied redirect URL.
- Handle expired sessions, OAuth callback errors, slow network requests, and database failures with accessible status messages and retry paths.



### Not signed in
- Allow the visitor to explore Services and prepare an enquiry.
- The sign-in/account action must preserve the current form draft and selected service before navigating to authentication.
- After successful sign-in, restore the draft and service selection when the user returns to the enquiry flow.
- Submit the enquiry only once the user intentionally submits it; avoid duplicate records.
- After successful persistence, redirect to the client dashboard and display the record.
- Validate any post-auth redirect against known internal routes; never trust an arbitrary user-supplied redirect URL.
- Handle expired sessions, OAuth callback errors, slow network requests, and database failures with accessible status messages and retry paths.

## Persistence, dashboard, and security

- Inspect the actual Supabase schema and existing client/admin dashboard queries before assuming a table or field name.
- Reuse the existing enquiry/lead schema where appropriate; do not create a parallel system.
- The client dashboard must display the persisted database record, not merely temporary browser state.
- Enforce per-client access with Supabase Row Level Security. Clients must not read or edit other clients’ enquiries or internal admin notes.
- Keep admin-only operations restricted to the existing authorised admin role.
- Never expose service-role keys or other privileged credentials in client-side code.
- Validate input, render user-provided content safely, and avoid XSS.
- Keep drafts temporary and clear them after successful submission. Do not store authentication tokens or secrets in the draft.
- Do not silently swallow errors or claim success without a confirmed database response.

## Conversion, discoverability, and usability

- Use one clear primary action, with service-specific actions where relevant.
- Explain what each service provides, what the client can expect next, and realistic delivery scope where supported by the current offering.
- Use real project evidence and genuine testimonials only; do not fabricate client logos, reviews, metrics, availability, or outcomes.
- Keep contact options visible at decision points.
- Improve page titles, metadata, descriptive headings, social-sharing metadata, internal links, and performance without adding keyword stuffing.
- Optimise images and loading behaviour while preserving the current visual identity.
- Keep mobile interactions, keyboard focus, labels, contrast, reduced-motion preferences, and form status announcements accessible.
- Track privacy-conscious funnel events where practical: service viewed/selected, enquiry started, successful enquiry, and enquiry failure. Do not collect unnecessary personal data.

## Required verification before merging to main

- Validate JavaScript syntax and HTML structure.
- Check for duplicate IDs and broken internal links.
- Test desktop and mobile navigation and the requested section order.
- Test each service selection and custom enquiry for signed-out visitors.
- Test that a signed-in client is sent Services → client dashboard modal with the exact service preselected; verify the homepage enquiry form is hidden for clients but remains available to signed-out visitors.
- Test that a signed-in request creates exactly one row in `proposals` with `client_id = auth.uid()`, appears in the Project requests tab after submission, and never creates a duplicate `leads` row.
- Test draft preservation when the session becomes authenticated and when proposal insertion fails; verify retry does not duplicate records.
- Test the admin role separately to confirm it retains its current admin dashboard and lead-review route.
- Confirm successful submissions persist in Supabase and appear only to the correct client/admin.
- Test invalid form data, repeated clicks, network/database failures, and expired sessions.
- Run existing automated checks and review the complete diff.
- Report exactly what passed, failed, or remains blocked by external configuration/manual testing.
- Only merge to `main` after the diff is reviewed and tests pass; never force-push or rewrite history.
