# Develop with Raman — Portfolio & Client Services

**Live website:** https://ramans.pages.dev  
**Repository:** https://github.com/ramanmanoharsingh/portfolio

This repository contains Raman's personal portfolio, web-development projects, machine-learning experiments, Arduino prototypes, and the source for the **Develop with Raman** website.

## Current status

- The repository's default branch is `main`.
- The website is a mostly static HTML/CSS/JavaScript project; there is no root-level package manager or mandatory build step.
- The main branch contains the existing portfolio and enquiry flow.
- [PR #1 — Portfolio quote shortlist](https://github.com/ramanmanoharsingh/portfolio/pull/1) is open and has not been merged.
- [PR #2 — Client portal and onboarding](https://github.com/ramanmanoharsingh/portfolio/pull/2) is a draft and has not been merged. Its additional portal pages must not be assumed to be live yet.
- Google/GitHub/other OAuth providers require configuration in the identity provider and Supabase dashboard. A code change alone cannot activate OAuth.

The public website is hosted at Cloudflare Pages. Confirm the Cloudflare project's connected branch and root/build directory in its dashboard before changing deployment settings; do not assume GitHub Pages instructions apply.

## Repository map

```text
.
├── develop-with-raman/       Website source, assets, SQL setup and portal work
├── projects/                 Individual coding and hardware projects
├── ideas/                    Project ideas and planning notes
├── profile/                  GitHub profile assets/content (where present)
├── README.md                 Repository overview and working instructions
├── FREELANCE_PORTAL_SETUP.md Supabase/enquiry and portal setup notes
└── .gitignore                Local files, secrets and generated artifacts
```

### Featured projects

| Project | Area | Main technologies |
|---|---|---|
| [PlayMatch Sports Network](projects/playmatch-sports-network) | Web application | HTML, CSS, JavaScript |
| [Plant Disease Detector](projects/plant-disease-detector) | AI / ML | Python, TensorFlow, Streamlit, OpenCV |
| [Titanic Kaggle ML](projects/titanic-kaggle-ml) | Data science | Python, pandas, scikit-learn, Jupyter |
| [PlayMate Finder](projects/playmate-finder) | Web prototype | HTML, CSS, JavaScript |
| [Arduino Smart Streetlight](projects/arduino-smart-streetlight) | Embedded systems | Arduino, C++ |
| [Arduino Soil Moisture Detector](projects/arduino-soil-moisture-detector) | Embedded systems | Arduino, C++ |
| [Python Assignments](projects/python-assignments) | Programming fundamentals | Python |

Each project should keep its own README with purpose, setup/run steps, dependencies, and known limitations. Preserve source data and educational files unless a deliberate review confirms they are redundant or safe to remove.

## Local development

1. Clone the repository and create a working branch from the latest `main`.
2. Open `develop-with-raman/index.html` directly for a static-page review, or use a local static server if you need route rewrites and realistic navigation.
3. Check browser developer tools for console errors, failed network requests, and responsive-layout issues.
4. Test changes on a preview deployment before merging them into the live site.
5. Keep commits focused and use pull requests for reviewable changes.

There is no single root-level automated test command at present. Add repeatable syntax, link, accessibility, and browser smoke tests before making broad refactors.

## Authentication and security

- Never commit passwords, OAuth client secrets, Supabase service-role keys, private API tokens, or real customer data.
- A Supabase publishable/legacy anon key may appear in browser code by design, but **Row Level Security (RLS)** must protect every exposed table and storage bucket.
- Set OAuth callback URLs and allowed redirects in the Supabase/provider dashboards. Keep production and preview URLs intentional.
- The portal in PR #2 adds more functionality, but it requires provider setup and end-to-end checks before release.
- Payment links are not the same as a complete payment integration; webhook-backed payment verification must be implemented before claiming automated payment reconciliation.

## Repository hygiene priorities

1. Keep `main` as the source of truth; rebase/recreate stale work on current `main` instead of merging old branches blindly.
2. Keep large media assets optimized and outside inline HTML where practical.
3. Split the large homepage into maintainable CSS/JavaScript modules only after preserving behavior with regression tests.
4. Document the actual Cloudflare Pages root directory, redirect behavior, environment/configuration needs, and release process.
5. Keep generated model weights, datasets, caches, build output, and local secrets out of Git.

See [the repository audit](docs/REPOSITORY_AUDIT.md) for the current findings and the cleanup plan.
