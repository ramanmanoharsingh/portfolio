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

### Already signed in
- Selecting “Start a Project” takes the user to Services first.
- Selecting a service prefills the enquiry form with that service.
- On submit, persist the enquiry before redirecting.
- Associate the record with the verified Supabase session user ID.
- After a successful save, redirect to the existing client dashboard and show the submitted enquiry/status there.
- Do not redirect on failure or pretend the request was saved when the database rejects it.

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
- Test each service selection and custom enquiry.
- Test signed-in and signed-out flows, including draft preservation and post-auth return.
- Confirm successful submissions persist in Supabase and appear only to the correct client/admin.
- Test invalid form data, repeated clicks, network/database failures, and expired sessions.
- Run existing automated checks and review the complete diff.
- Report exactly what passed, failed, or remains blocked by external configuration/manual testing.
- Only merge to `main` after the diff is reviewed and tests pass; never force-push or rewrite history.
