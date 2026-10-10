# Develop with Raman — client portal setup

**Production URL:** https://ramans.pages.dev  
**Repository:** https://github.com/ramanmanoharsingh/portfolio  
**Stack:** plain HTML/CSS/JavaScript + Cloudflare Pages + existing Supabase project

## Architecture decisions

- Public portfolio pages do not require an account.
- Client accounts are intended for clients after a project is accepted; they should be invited by the site owner rather than created through public registration.
- Sign-in methods selected for this implementation are email/password and Google.
- The administrator account and client data permissions are enforced in Supabase policies and the private `private.is_admin()` helper. Hiding a page or button is not sufficient authorization.

## Cloudflare Pages

The frontend uses root-relative URLs. The intended output directory is `develop-with-raman` with no build command for this static HTML/CSS/JS site. Verify this against the existing Cloudflare Pages project before changing settings. The `_headers` and `_redirects` files live in that directory.

## Supabase Auth configuration

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to `https://ramans.pages.dev`.
3. Add exact redirect URLs:
   - `https://ramans.pages.dev/auth-callback.html`
   - `https://ramans.pages.dev/reset-password.html`
   - `https://ramans.pages.dev/`
4. Enable Email and Google in **Authentication → Sign In / Providers**.
5. In Google Cloud Console, create an OAuth client of type **Web application**. Add the Supabase callback URI shown in Supabase as the Google Authorized redirect URI; configure the exact production origin `https://ramans.pages.dev` as an authorized JavaScript origin where requested. Store the Google client ID and secret in Supabase provider settings, never in this repository.
6. Enable email confirmation and **leaked-password protection**. The Supabase security advisor currently reports leaked-password protection as disabled.
7. Disable public sign-ups in Supabase Auth settings if you want the invite-only client workflow. This dashboard setting is essential: removing a “Create account” button is not a backend security control.
8. Invite accepted clients using **Authentication → Users → Invite user**, with redirect URL `https://ramans.pages.dev/auth-callback.html`. The invite callback sends them to set their password, then they can sign in normally.
9. Verify your own administrator profile has `role = 'admin'` in `public.profiles`. Do not expose admin role assignment in client-editable UI.

## Data and permissions

The connected project already has a client portal schema including `profiles`, `projects`, `milestones`, `tasks`, `messages`, `deliverables`, `proposals`, `invoices`, `leads`, and `enquiries`. The inspected tables had RLS enabled, and the deliverables bucket has owner/client policies. Keep testing policies against both client and admin identities after changes.

## Security limitations to resolve

- The Supabase security advisor reported **Leaked Password Protection Disabled**. Enable it under Auth/password security settings.
- The browser uses the Supabase publishable key. This key is expected to be public; never expose a service-role key, database password, or Google client secret.
- Browser role checks improve UX but do not enforce permissions. RLS/storage policies must block cross-client access and non-admin mutations.
- Supabase's browser SDK manages sessions in browser storage in this static architecture; this is not equivalent to an HttpOnly server-side cookie. Do not store additional secrets in browser storage.
- Google OAuth and email flows cannot be fully validated until provider credentials, redirect allowlist, email templates, and live deployment settings are confirmed.

## Acceptance tests

- Logged-out visitors can use all public pages and submit a public enquiry.
- Public registration is blocked by Supabase when the invite-only setting is enabled.
- An invited client can accept the invite, set a password, sign in, and access only their own project data.
- Password reset and expired-link behavior work.
- Google OAuth succeeds for an authorized account; cancellation/provider failures show a clear message.
- Client attempts to access another client's records and all admin mutations are rejected by RLS.
- The administrator can manage portal data only while using the verified admin account.
- Sign-out, page refresh, session expiry, mobile layout, and keyboard focus behavior are checked before launch.


## Additional database hardening (2026-10-10)

- Tightened the `Clients submit own proposals` insert policy so an authenticated client can create a proposal only for their own user ID and only with the initial `submitted` status. Clients cannot use the insert policy to create proposals already marked `accepted`, `declined`, `quoted`, or `converted`.
- The migration was applied to the connected Supabase project and is also recorded in `develop-with-raman/migrations/20261010_restrict_client_proposal_status.sql`.
- Admin proposal management remains covered by the separate administrator policy. Follow up with authenticated client/admin integration tests and re-run Supabase advisors.
