# Supabase setup for Develop with Raman

The sign-in UI is wired for Supabase Auth, but it stays safely disabled until a project is configured.

## 1. Create the Supabase project
1. Create a project in Supabase.
2. Open **Project Settings → API** and copy the Project URL and publishable/anon key.
3. Put those two public client values in `supabase-config.js`.
4. Run `supabase/schema.sql` in the Supabase SQL Editor.

Only the Project URL and publishable/anon key belong in the browser. Never use a `service_role` key in this repository.

## 2. Configure email login
In **Authentication → URL Configuration**, add the live GitHub Pages URL and the local development URL to the allowed redirect URLs. Configure email confirmation and password recovery to match your preferred workflow.

## 3. Configure Google and Apple
In **Authentication → Providers**, enable Google and Apple and add the OAuth credentials issued by each provider. Set each provider's callback URL exactly as shown by Supabase. Add the website's live URL to the provider's authorized redirect/origin settings as required.

The buttons call Supabase OAuth; they do not pretend to sign users in if provider configuration is missing.

## 4. Current scope and limitations
- Email/password sign-up and sign-in, Google OAuth, Apple OAuth, password recovery, session restoration, and sign-out are wired in the browser UI.
- Supabase's `profiles` and optional authenticated `project_requests` tables have row-level security enabled.
- The existing public enquiry form still uses the site's existing database integration when available and otherwise falls back to the visitor's email app. The optional request-history table is not connected to the enquiry form yet.
- No live payment processing is configured. Add a payment provider through a server-side endpoint/edge function, and verify payment webhooks server-side before marking invoices paid.
- The current legacy admin panel relies on a separate host-provided integration. It is not replaced by a secure Supabase admin dashboard in this change.

## 5. Before launch
Test sign-up, email confirmation, login, Google/Apple redirects, recovery, session expiry, and sign-out on the live domain. Review Supabase Auth rate limits and RLS policies. Do not enable public admin access.
