# One PDF = One Book = One Branch = One URL

Each student/session book lives on its own Git branch with exactly **one PDF** in `public/chapters/`.

## Create a book branch

```bash
node scripts/create-book-branch.mjs --slug 01-demo-1 --title "Demo 1" --pdf Demo-1.pdf --push
```

## Demo books

| Branch | PDF | Graphy / student link |
|--------|-----|------------------------|
| `book/01-demo-1` | Demo-1.pdf | Deploy this branch → share live URL |
| `book/02-demo-2` | Demo-2.pdf | Deploy this branch → share live URL |
| `book/03-demo-3` | Demo-3.pdf | Deploy this branch → share live URL |
| `book/04-demo-4` | Demo-4.pdf | Deploy this branch → share live URL |

All branches share the same StringStack logo, theme, session pages, and reader UI.

See `books/registry.json` for branch names and GitHub links.
