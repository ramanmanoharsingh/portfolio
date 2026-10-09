# Develop with Raman — client portal setup

The portal frontend is already committed in `develop-with-raman/index.html`. It includes email/password sign-up and sign-in, password reset, Google and Apple OAuth buttons, a client dashboard, a private owner dashboard, enquiry status management, CSV export, and live-refresh hooks. The site uses **Supabase**, not Firebase, so it can run on Supabase's free tier.

## What is already in the website

- Supabase client configuration is present in the page using a browser-safe publishable key.
- The owner dashboard is keyed to the verified account email `ramanmanoharsingh@gmail.com`.
- The page has no fixed Starter/Standard/Pro package tiers; projects are scoped and quoted individually.
- No payment collection is implemented.
- The service-role key and OAuth client secrets must never be added to the HTML or committed to GitHub.

## One-time setup still required in Supabase

1. Sign in to the Supabase project whose URL is configured in the page. If you do not own that project, create a new project on the **Free** plan at https://supabase.com/ and replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the page with that project's URL and publishable/anon key.
2. In **SQL Editor**, run the entire `develop-with-raman/supabase-setup.sql` file.
3. In **Authentication → URL Configuration**, set the Site URL to `https://ramanmanoharsingh.github.io/portfolio/develop-with-raman/` and add the same URL to the redirect URL allowlist.
4. In **Authentication → Sign In / Providers**, enable Email. For account confirmation and password reset, configure the email settings and test the confirmation/reset links.
5. For Google sign-in, create an OAuth client in Google Cloud Console. Add the Supabase callback URL shown in Supabase's Google provider setup as an authorized redirect URI, then enter the Google client ID and secret in Supabase. Do not put the secret in this repository.
6. Sign up and verify `ramanmanoharsingh@gmail.com` as the owner account. Sign in with it to test the owner dashboard.
7. Test client registration, email login, password reset, a signed-in enquiry, client enquiry history, owner lead filters/status updates, and CSV export.

## Apple sign-in

Apple sign-in requires Apple Developer / OAuth configuration in addition to Supabase provider setup and may involve paid Apple Developer membership. It cannot be made functional purely by changing this repository. If you do not want any paid setup, use email/password and Google sign-in and leave Apple disabled in Supabase.

## Security and limitations

- The publishable/anon key is intended for browser use; Row Level Security (RLS) is mandatory.
- Never publish a Supabase service-role key, database password, or OAuth client secret.
- Clients should only read enquiries attached to their authenticated user ID. Anonymous enquiries are intended for owner review only.
- GitHub Pages is static hosting and cannot run private server code; Supabase provides hosted authentication and database services.
- Google OAuth cannot be activated solely by a code commit: its client credentials must be configured in the Google and Supabase dashboards.
- If the Supabase project URL/key in the HTML belongs to an unavailable or unowned project, replace them with credentials from a project you control.
