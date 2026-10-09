# Develop with Raman — Supabase client workspace

The site is a plain HTML/CSS/JavaScript website hosted on GitHub Pages. The client workspace is already wired to Supabase Auth and the `public.leads` table; it is waiting for your own Supabase project credentials. No React build step is required.

## What is implemented

- Custom-quote enquiry form (no fixed plan/package pricing).
- Email/password sign-up, sign-in and password reset.
- Google and Apple OAuth buttons (each provider must be configured in Supabase first).
- Client dashboard showing enquiries linked to the signed-in account.
- Owner dashboard for `ramanmanoharsingh@gmail.com`, with status filters, status updates, live refresh and CSV export.
- Row Level Security (RLS) policies in `develop-with-raman/supabase-setup.sql`.

## 1. Create a Supabase project

1. Open [Supabase](https://supabase.com/) and sign in.
2. Create a new project, choose a project name and a strong database password, and select the Free plan.
3. Wait for the project to finish provisioning.
4. In the project dashboard, open **Project Settings → API** (the exact menu label may be **API Keys** in the newer dashboard).
5. Copy the **Project URL** and the browser-safe **publishable key** (or legacy `anon` key). Never copy a `service_role` or secret key into this website.

## 2. Connect the repository

1. Open [the website HTML](https://github.com/ramanmanoharsingh/portfolio/blob/main/develop-with-raman/index.html).
2. Find these two constants near the bottom of the file:
   ```js
   const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
   ```
3. Replace the placeholder URL and key with the values from your Supabase project. The publishable/anon key is designed to be used in browser code; database permissions must be enforced by RLS.
4. Commit the edit to `main`. GitHub Pages will publish the updated static page.

## 3. Create the database and security policies

1. In Supabase, open **SQL Editor → New query**.
2. Open [`develop-with-raman/supabase-setup.sql`](https://github.com/ramanmanoharsingh/portfolio/blob/main/develop-with-raman/supabase-setup.sql) in the repository, copy its full contents, paste into the SQL Editor, and run it.
3. Confirm that the `public.leads` table exists under **Table Editor**.
4. Keep RLS enabled. Do not make the table publicly readable and never add the service-role key to HTML.

The SQL policy grants owner access based on the configured owner email `ramanmanoharsingh@gmail.com`. The dashboard uses that same email to choose the owner UI. If you want to use another admin email, update both the HTML constant `OWNER_EMAIL` and the owner email checks in the SQL, then rerun the SQL.

## 4. Configure authentication URLs

In Supabase, open **Authentication → URL Configuration**:

- **Site URL:** `https://ramanmanoharsingh.github.io/portfolio/develop-with-raman/`
- Add that exact URL to **Redirect URLs**.
- Also add your eventual custom-domain URL if you use one.

Email confirmation is recommended. When enabled, test sign-up and follow the verification email before signing in.

## 5. Enable Google sign-in

1. In Supabase, open **Authentication → Sign In / Providers → Google** and copy the callback URL shown there (it looks like `https://<project-ref>.supabase.co/auth/v1/callback`).
2. Open [Google Cloud Console](https://console.cloud.google.com/), create/select a project, and configure the OAuth consent screen.
3. Create an OAuth Client ID of type **Web application**.
4. Add this as an **Authorized JavaScript origin**: `https://ramanmanoharsingh.github.io`
5. Add the Supabase callback URL from step 1 as an **Authorized redirect URI**.
6. Copy the Google Client ID and Client Secret into the Google provider settings in Supabase and enable the provider.

Google OAuth credentials are configured in Supabase, not in the public HTML. Google sign-in will not work until this setup is complete.

## 6. Apple sign-in (optional)

Apple sign-in also needs an Apple Developer configuration, including a Services ID, Sign in with Apple setup, key and domain/callback configuration. It may require a paid Apple Developer membership. If you do not have those credentials, leave Apple disabled for now; email and Google can work without it.

## 7. Test both roles

1. Open the live site and create a test client account using an email you control.
2. Verify the email if prompted, then sign in and submit a test enquiry while signed in.
3. Sign out and sign in as `ramanmanoharsingh@gmail.com`. The enquiry should appear in the owner dashboard.
4. Sign back in as the client. The client dashboard should show only enquiries tied to that account.
5. Test Google sign-in after provider configuration.
6. Test status changes and CSV export from the owner dashboard.

## Important limits

- GitHub Pages only serves static files. Supabase provides authentication, database and row-level security.
- The client dashboard currently tracks **enquiries and their statuses**. It is not yet a full project-management system with milestones, file uploads, invoices or payments.
- Guest enquiries can be submitted, but because they have no signed-in user ID, they are visible to the owner and do not automatically attach to a client account later.
- Supabase Free has usage and inactivity limits. Check the current Supabase pricing/limits before relying on it for a production business.
- Never place a database password, OAuth client secret, service-role key, or other private server credential in the HTML or GitHub repository.
