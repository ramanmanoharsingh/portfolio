# Develop with Raman — client workspace setup

The portfolio now uses a **custom quote** model (no fixed packages or automatic price tiers). The contact form writes enquiries to the Firestore `leads` collection; the owner dashboard reads and manages that pipeline after sign-in. WhatsApp is not used as the enquiry destination.

## One-time Firebase setup required

The repository cannot create a Firebase project or enable identity providers without access to your Firebase account. Until this is completed, the site intentionally shows a setup-required message rather than pretending that login/storage works.

1. Open the Firebase console and create a project.
2. Add a **Web app** and copy its config.
3. In `develop-with-raman/index.html`, replace the three placeholders in `firebaseConfig` (`apiKey`, `authDomain`, `projectId`, `appId`) with the values Firebase provides. Do not put service-account/private server keys in this public HTML.
4. In Firebase Authentication → Sign-in method, enable **Email/Password**, **Google**, and **Apple**. Apple also requires an Apple Developer Service ID, key and domain configuration.
5. In Authentication → Settings → Authorized domains, add `ramanmanoharsingh.github.io` and any custom domain you use.
6. Create a Cloud Firestore database.
7. Publish the rules in `firestore.rules` to Firestore → Rules. These restrict pipeline access to the owner email `ramanmanoharsingh@gmail.com`; clients can read only their own signed-in enquiries. Public visitors can submit new enquiries but cannot read the collection.
8. Test with a client account and the owner account. Submit one test enquiry while signed in and another while signed out. Confirm both appear in the owner pipeline, while clients see only enquiries linked to their own UID.

## Current behaviour and limits

- **Owner account:** sign in with `ramanmanoharsingh@gmail.com` to access the owner pipeline.
- **Clients:** can register/sign in and track enquiries created while signed in.
- **Guest enquiries:** appear in the owner pipeline; they are not automatically linked to a later-created client account.
- **Enquiry management:** owner can filter by status, update status, and reply using the visitor's email.
- **Quotes and payments:** the site does not collect payments or promise a price before a written scope is agreed.
- **Security:** Firebase client config is public by design; Firestore rules enforce data access. Never place private keys in the HTML.

## Logic-check checklist

- No fixed plan/package prices or automatic quote calculation.
- Contact form validates name, email and project description.
- Guest enquiries do not require WhatsApp and do not launch a WhatsApp conversation.
- Dashboard visibility depends on Firebase Auth + Firestore rules, not merely hidden UI.
- Provider sign-in will not work until each provider is enabled and configured in Firebase.
