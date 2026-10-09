# Develop with Raman — client portal setup

The site is a static GitHub Pages frontend with a Supabase Auth + Postgres backend integration. The Supabase free tier is enough to start; Google sign-in and email/password can be used without Firebase billing. Apple sign-in requires Apple Developer configuration and may involve a paid Apple Developer membership.

## Connect the free backend

1. Create a project at https://supabase.com/ and choose the Free plan.
2. In the Supabase dashboard, open **Project Settings → API** (or **Connect**) and copy the Project URL and publishable/anon key.
3. Open `develop-with-raman/index.html` and find the Supabase configuration block near the client-portal script. Replace the placeholder URL/key with those two public client values.
4. In Supabase **SQL Editor**, run the complete `develop-with-raman/supabase-setup.sql` file from this repository. It creates the `leads` table and row-level security policies.
5. In **Authentication → URL Configuration**, set the site URL to `https://ramanmanoharsingh.github.io/portfolio/develop-with-raman/` and add that URL to the redirect URL allowlist.
6. In **Authentication → Providers**, enable Email and Google. Configure Google OAuth credentials in the Google Cloud console and enter the client ID/secret in Supabase. Keep all OAuth client secrets in the provider dashboard, never in this repository.
7. For owner access, sign up with `ramanmanoharsingh@gmail.com` and verify the email. The site uses that email to display the owner dashboard; database access is additionally protected by row-level security policies.
8. Test client sign-up, email/password login, Google login, password reset, client-only enquiry visibility, owner lead pipeline, and status updates.

## Apple sign-in

The button is present in the UI, but Apple login is not operational until Apple OAuth is configured in Supabase and Apple Developer settings. If you do not have that setup, leave the provider disabled; the site should report that the provider is not configured rather than pretending login succeeded.

## Security and current limits

- The public Supabase URL and anon/publishable key are intended for browser use; row-level security is essential.
- Never put a Supabase service-role key, database password, or OAuth client secret in frontend code or commit it to GitHub.
- Clients should only be able to read their own enquiries. The owner policy allows the designated owner email to manage the enquiry pipeline.
- GitHub Pages cannot run private server code itself; Supabase provides the hosted auth/database services.
- No fixed Starter/Standard/Pro package tiers are used. Clients request a custom scope and receive a written quote before work begins.
- No payment is collected on the website.
- The website cannot be fully live-connected until you create the Supabase project, configure providers, and add its project URL and public anon/publishable key.
