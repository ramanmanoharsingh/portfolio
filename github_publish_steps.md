# How To Put This Portfolio On GitHub

Your GitHub connector is available for account `ramanmanoharsingh`, but the safest first version is to push this local folder yourself so you control the repo names.

## Option A: One Portfolio Repository

Open PowerShell in this folder:

```powershell
cd "C:\Users\Raman\OneDrive\Documents\New project\portfolio-repository"
git init
git add .
git commit -m "Create portfolio repository"
git branch -M main
git remote add origin https://github.com/ramanmanoharsingh/portfolio.git
git push -u origin main
```

Before running `git push`, create an empty GitHub repository named `portfolio`.

## Option B: GitHub Profile README

To show a portfolio directly on your GitHub profile:

1. On GitHub, create a repository named exactly:

```text
ramanmanoharsingh
```

2. Copy `profile/README.md` from this portfolio folder into that new repository as `README.md`.
3. Commit and push it.
4. GitHub will display it at the top of your profile.

## Recommended Pinned Repositories

Pin these on your GitHub profile:

1. `playmatch-sports-network`
2. `plant-disease-detector`
3. `titanic-kaggle-ml`
4. `playmate-finder`
5. `portfolio`
6. One new strong project from `ideas/portfolio_project_ideas.md`

## What To Avoid

- Do not push `.venv/`
- Do not push trained model files unless they are small
- Do not push private datasets or secrets
- Do not push huge raw datasets; use Kaggle/source links instead

