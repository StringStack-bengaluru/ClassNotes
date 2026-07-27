# StringStack.ai — Digital Book Reader

Premium digital textbook reader. One Docs file (`.docx`) = one book branch = one live GitHub Pages URL.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Daily publish (Docs → live URL)

**Full guide:** [docs/DAILY-BOOK.md](docs/DAILY-BOOK.md)

```powershell
npm run new-book -- 05-day-05 "books/sources/Day-05-Session.docx" "Day 05 Session" deploy
```

That creates `book/05-day-05`, pushes it, and pushes `main` to deploy.

**Live URL pattern:**  
`https://udaymi8871.github.io/TextBook/<slug>/`

**List books:**

```bash
npm run list-books
```

## Manual deploy only

If the book branch is already pushed but the site is stale:

```powershell
npm run deploy-books
```

Or: GitHub → Actions → **Deploy Books to GitHub Pages** → **Run workflow**

## Project Structure

```
books/
├── registry.json          # All published books + URLs
└── sources/               # Drop / archive daily .docx files
public/chapters/           # Active book content (per branch)
content/book.config.json   # Book metadata for current branch
scripts/
├── create-book-branch.mjs # npm run new-book
├── docxToContent.mjs      # Docs → Q&A JSON (2 per page)
└── buildManifest.mjs
docs/
└── DAILY-BOOK.md          # Daily publish steps
```

## Tech Stack

React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · react-pageflip · PDF.js (legacy PDF books)

## License

Private — StringStack.ai
