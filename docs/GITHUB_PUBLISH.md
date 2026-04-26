# Publishing Nurse Joyless to GitHub

Do not paste a GitHub personal access token into chat, code, commits, or docs.

## Option A: GitHub CLI

```bash
cd nurse-joyless
gh auth login
gh repo create nurse-joyless --public --source=. --remote=origin --push
```

## Option B: Git remote

Create an empty repository on GitHub first, then run:

```bash
cd nurse-joyless
git init
git add .
git commit -m "Initial Nurse Joyless V3.5 release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nurse-joyless.git
git push -u origin main
```
