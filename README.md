# Develop with Raman

**Production site:** https://ramans.pages.dev  
**Repository:** https://github.com/ramanmanoharsingh/portfolio

This is a plain HTML/CSS/JavaScript freelance portfolio with a Supabase-backed private client workspace. The public portfolio remains accessible without an account; project records, messages, milestones, invoices, and deliverables are reserved for authorized clients and the administrator.

## Chosen stack

- **Frontend:** existing HTML, CSS, and JavaScript (no framework migration)
- **Hosting:** Cloudflare Pages at `https://ramans.pages.dev`
- **Authentication and database:** existing Supabase project
- **Sign-in methods:** email/password and Google
- **Client access:** client accounts are intended to be invited after a project is accepted
- **Roles:** client and admin, enforced by Supabase Row Level Security (RLS) and the private `private.is_admin()` helper—not by UI visibility alone

## Current implementation

- Public portfolio and enquiry form
- Supabase email/password sign-in and password reset
- Google OAuth entry point (requires Google and Supabase provider configuration)
- Client workspace for assigned projects, milestones, messages, profile, and private deliverables
- Admin workspace for managing client projects, proposals, invoices, milestones, and deliverables
- RLS enabled on inspected application tables and private storage policies for client deliverables
- Cloudflare Pages `_headers` and `_redirects` files in `develop-with-raman/`

## Cloudflare Pages configuration

The app uses root-relative paths such as `/auth.html` and `/client-dashboard.html`. Configure Cloudflare Pages so the contents of `develop-with-raman/` are the deployed site root (build command can be blank for this static site; output directory should be `develop-with-raman`). Verify this against the existing project settings before changing deployment settings.

## Supabase configuration checklist

1. In Supabase **Authentication → URL Configuration**, set the production Site URL to `https://ramans.pages.dev`.
2. Add these exact production redirects to the allowed redirect URL list:
   - `https://ramans.pages.dev/auth-callback.html`
   - `https://ramans.pages.dev/reset-password.html`
   - `https://ramans.pages.dev/`
3. Add exact local development URLs only when needed; avoid broad wildcards in production.
4. In **Authentication → Sign In / Providers**, enable Email and Google. Configure Google credentials only in Supabase and Google Cloud Console.
5. In Supabase Auth settings, disable public sign-ups if the invitation-only client model is required. Hiding the registration button is not a backend security control.
6. Enable email confirmation and leaked-password protection. Configure the email templates and test invitation and recovery links.
7. After a project is accepted, invite the client in Supabase **Authentication → Users → Invite user**. Use `https://ramans.pages.dev/auth-callback.html` as the redirect URL. The callback should send invited clients to set their password.
8. Confirm the administrator account has the `admin` role in `public.profiles`. Never grant admin role from browser code or client-editable metadata.

## Security notes

- The Supabase publishable key in browser code is intentionally public; it is not a server secret. Never put a service-role/secret key, database password, or OAuth client secret in HTML, JavaScript, or Git.
- RLS must remain enabled. Frontend role checks are for navigation/UX; RLS and server-side authorization are the actual boundary.
- The connected Supabase security advisor reported **Leaked Password Protection Disabled**. Enable it in Supabase Auth settings.
- This static frontend uses Supabase JS-managed browser sessions, not an HttpOnly server-side cookie. Do not store any additional secrets or tokens yourself.
- Provider setup, production redirects, public sign-up settings, email delivery, and live end-to-end tests must be verified in the Supabase/Cloudflare dashboards. A code commit alone cannot configure these external settings.
- No production security certification is implied by this README.

## Test before launch

- Public pages work while logged out.
- Uninvited sign-up is rejected by Supabase when public sign-ups are disabled.
- An invited client can accept the invitation, set a password, sign in, and see only their own project data.
- Google login works for an authorized account and shows useful errors when setup is missing or consent is cancelled.
- Password recovery and expired/invalid links are handled clearly.
- A client cannot read another client's projects, messages, milestones, invoices, or files, or perform admin actions.
- Only the verified administrator account with the database-backed admin role can use admin operations.
- Sign-out, refresh, session expiry, mobile layout, and keyboard navigation work.
