# Document mode (formatted DOCX) — parallel to Q&A

**Default books stay Q&A.** This is an opt-in second reader path that preserves original document structure (paragraphs, blank lines, bold/italic, lists, tables, images, code).

## Why it exists

Stakeholders need the Digital Book to feel like the original Word doc — not a flattened plain-text Q&A export. Q&A mode remains for quiz-style sessions. Document mode is for faithful layout.

## What is NOT changed

| Piece | Status |
|-------|--------|
| `docxToContent.mjs` (Q&A convert) | Untouched |
| `QaContentPage` / Q&A flip layout | Untouched |
| Default `new-book` without `document` | Still Q&A |
| Existing live Q&A URLs | Unchanged until you republish with `document` |

## How to publish a formatted book

```bash
cd DigitalNotes
npm run new-book -- notes-java-demo-3-doc "books/sources/Notes Java Demo-3.docx" "Notes Java Demo-3" document deploy
```

Use a **new slug** if you want both Q&A and document versions live (recommended for rollout).

Or convert an existing slug to document mode by republishing with `document` (overwrites that book branch content).

## Config flag

`content/book.config.json`:

```json
{
  "readerMode": "document"
}
```

- `"qa"` or omitted → prefer `.content.json` (current behavior)
- `"document"` → prefer `.document.json` when present

## Pipeline

```
.docx
  ├─→ .content.json     (Q&A — existing)
  └─→ .document.json    (blocks + pages — new)
         └─→ contentMode: "document" → DocumentContentPage
```

Both JSON files may be generated on build. Only `readerMode` chooses which the live book uses.

## What document mode preserves (v1)

- Separate paragraphs (never joined with spaces)
- Blank paragraph gaps
- Soft line breaks inside a paragraph (`whitespace-pre-line`)
- Bold / italic / underline runs
- Headings (from Word heading styles)
- Bullet lists (Word numbering)
- Tables (scrollable on small screens)
- Images (extracted + click-to-zoom)
- Code-styled paragraphs (monospace + horizontal scroll)
- Quotes (Word quote styles)

## Honest limits (v1)

Not 100% Word WYSIWYG yet:

- Complex text boxes / floating shapes
- Full merged-cell table fidelity
- Exact fonts / page margins from Word
- Callout box styles beyond quote/border heuristics
- PDF “document mode” (use existing PDF page canvas books for pixel-faithful PDF)

## Local preview

```bash
# On a book branch with readerMode: document
npm run sync-chapters
npm run dev
```

## QA checklist

- [ ] Paragraphs appear on separate lines (not one merged block)
- [ ] Blank lines create visible gaps
- [ ] Bold/italic match the DOCX
- [ ] Lists and tables readable on mobile
- [ ] Q&A books without `document` flag still look unchanged
