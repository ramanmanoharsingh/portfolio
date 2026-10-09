# Client portal and freelance dashboard setup

The frontend is prepared for Firebase Authentication + Cloud Firestore. GitHub Pages is static hosting, so it cannot securely create accounts or store private enquiries on its own.

## One-time setup
1. Open https://console.firebase.google.com/ and create a Firebase project.
2. In Project settings → General → Your apps, register a Web app and copy its Firebase config.
3. Authentication → Sign-in method: enable Email/Password and Google. Apple sign-in also requires an Apple Developer account, Services ID, key, and callback configuration; enable it only after those are ready.
4. Authentication → Settings → Authorized domains: add `ramanmanoharsingh.github.io`.
5. Create a Cloud Firestore database.
6. Replace the placeholder `firebaseConfig` in `develop-with-raman/index.html` with the web app config. The website intentionally does not claim authentication or storage works until real config values are added.
7. Publish `firestore.rules` to Firestore (Firebase Console → Firestore → Rules).
8. Create/sign in to the owner account using `ramanmanoharsingh@gmail.com` and verify the email. The owner dashboard is selected by that email plus Firebase's verified-email claim; never put a private service-account key in frontend code.
9. Test client sign-up, email verification, Google login, Apple login (after Apple setup), password reset, client-only visibility, owner lead pipeline and status updates.

## What still needs your Firebase project
I can prepare and commit the website code, rules, and setup instructions from this repository. I cannot create/own your Firebase project or generate its real web-app configuration on your behalf. After you create the Firebase project, paste the **Web app config** (apiKey, authDomain, projectId, appId) here and I can wire it into the site. Do not share passwords, service-account private keys, or Apple private keys.

## Logic decisions
- Removed fixed Starter/Standard/Pro packages; clients request custom scope and a written quote.
- Enquiries are designed to go to Firestore, not WhatsApp.
- Signed-in clients see only records tied to their Firebase UID; owner sees all leads.
- Owner status options: New, Contacted, Scoped, In Progress, Waiting on Client, Completed, Declined.
- Anonymous enquiries are permitted and visible only to the owner. For account-only enquiries, remove the anonymous create clause and require login before submission.
- The frontend refuses to claim data was sent while Firebase config is missing.
- Never store service-account private keys in this repository.
