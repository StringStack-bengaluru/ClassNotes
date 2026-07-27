# Daily book publish (Docs → live URL)

One **docx** = one **book branch** = one **GitHub Pages URL**.

## What you need each day

1. Today’s Word file (`.docx`) with Q&A content  
2. A slug like `05-day-05` (number prefix sets **Day-05 Session**)  
3. A short title, e.g. `Day 05 Session`

## Option A — One command (recommended)

Put the file in `books/sources/` (or pass any path).

**Windows / PowerShell (use this — npm strips `--slug` flags):**

```powershell
npm run new-book -- 05-day-05 "books/sources/Day-05-Session.docx" "Day 05 Session" deploy
```

**Or call node directly (flags work):**

```powershell
node scripts/create-book-branch.mjs --slug 05-day-05 --docx "books/sources/Day-05-Session.docx" --title "Day 05 Session" --deploy
```

This will:

1. Create/update branch `book/05-day-05`
2. Convert docx → 2 questions per page
3. Push the book branch
4. Update `books/registry.json` on `main`
5. Push `main` → **starts GitHub Pages deploy**
6. Print:

- Branch URL  
- Live URL: `https://udaymi8871.github.io/TextBook/05-day-05/`

Wait **2–5 minutes**, then open the live URL.

Watch deploy: https://github.com/udaymi8871/TextBook/actions

---

## Option B — Manual steps (if `--deploy` fails)

### 1) Create + push the book branch

```powershell
git checkout main
npm run new-book -- 05-day-05 "books/sources/Day-05-Session.docx" "Day 05 Session" push
```

### 2) Trigger deploy from `main` (required)

GitHub Pages **only** deploys when `main` is pushed:

```powershell
git checkout main
git commit --allow-empty -m "Deploy books including 05-day-05"
git push origin main
```

### 3) Copy these URLs to share

| What | URL |
|------|-----|
| Branch | `https://github.com/udaymi8871/TextBook/tree/book/05-day-05` |
| Live book | `https://udaymi8871.github.io/TextBook/05-day-05/` |
| Actions | `https://github.com/udaymi8871/TextBook/actions` |

---

## Option C — Manual deploy only (branch already pushed)

If the book branch is already on GitHub:

1. Open https://github.com/udaymi8871/TextBook/actions  
2. Open **Deploy Books to GitHub Pages**  
3. Click **Run workflow** → branch `main` → **Run workflow**

---

## Local preview before deploy

```powershell
git checkout book/05-day-05
npm run dev
```

Open http://localhost:5173/

---

## Slug rules

| Slug | Session label | Live path |
|------|---------------|-----------|
| `05-day-05` | Day-05 Session | `/TextBook/05-day-05/` |
| `java-fundamentals` | Day-01 Session | `/TextBook/java-fundamentals/` |

Prefer numbered slugs (`01-…`, `02-…`) for daily sessions.

---

## Args

```text
npm run new-book -- <slug> "<docx-path>" "<title>" deploy

slug     required (e.g. 05-day-05)
docx     path to .docx
title    optional display title
deploy   push book branch + push main (deploy)
push     push book branch only
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Live URL 404 | Wait for Actions to finish; hard-refresh |
| Old content on live site | Confirm `book/<slug>` was pushed, then push `main` again |
| Overlap / layout bugs | Fix on `book/<slug>`, push that branch, then push `main` to redeploy |
| `python` missing on CI | Docs convert needs Python on the runner; content.json is also committed as fallback |

If stuck, tell the agent: slug, whether `--push` / `--deploy` ran, and the Actions run link.
