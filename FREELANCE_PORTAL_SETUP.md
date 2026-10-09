# Client portal and freelance dashboard setup

The frontend is prepared for Firebase Authentication + Cloud Firestore. GitHub Pages is static hosting, so it cannot securely create accounts or store private enquiries on its own.

## One-time setup
1. Create a Firebase project at https://console.firebase.google.com/ and register a Web app.
2. Authentication → Sign-in method: enable Email/Password, Google, and Apple. Apple also needs Apple Developer Services ID/key and callback configuration.
3. Authentication → Settings → Authorized domains: add `ramanmanoharsingh.github.io`.
4. Create a Cloud Firestore database.
5. Replace the placeholder `firebaseConfig` in `develop-with-raman/index.html` with the web app's config.
6. Publish `firestore.rules` to Firestore (Firebase Console → Firestore → Rules).
7. Create the owner account using `ramanmanoharsingh@gmail.com`.
8. Test sign-up, verification, Google login, Apple login, reset, client-only visibility, owner lead pipeline and status updates.

## Logic decisions
- Removed fixed Starter/Standard/Pro packages; clients request custom scope and a written quote.
- Enquiries are designed to go to Firestore, not WhatsApp.
- Signed-in clients see only records tied to their Firebase UID; owner sees all leads.
- Owner status options: New, Contacted, Scoped, In Progress, Waiting on Client, Completed, Declined.
- Anonymous enquiries are permitted and visible only to the owner. For account-only enquiries, remove the anonymous create clause and require login before submission.
- The frontend refuses to claim data was sent while Firebase config is missing.
- Never store service-account private keys in this repository.
