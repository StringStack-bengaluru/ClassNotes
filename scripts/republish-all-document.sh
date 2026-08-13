#!/bin/zsh
# Republish all ClassNotes (notes-java-*) books in document mode.
set -euo pipefail
cd /Users/mac/Desktop/ClassNotes/DigitalNotes

git restore --worktree --staged -- public/api/book-manifest.json content/book.config.json 2>/dev/null || true
git checkout main
git pull stringstack main

# Commit the checkout-noise fix if present, then push so batch uses it
if ! git diff --quiet scripts/create-book-branch.mjs 2>/dev/null; then
  git add scripts/create-book-branch.mjs
  git commit -m "Fix book deploy blocked by dirty book-manifest on checkout"
  git push stringstack main
fi

echo "=== notes-java-datatypes-1 ==="
npm run new-book -- notes-java-datatypes-1 "books/sources/Notes Java DataTypes-1.docx" "Notes Java DataTypes-1" document deploy

echo "=== notes-java-datatypes-2 ==="
npm run new-book -- notes-java-datatypes-2 "books/sources/Notes Java DataTypes-2.docx" "Notes Java DataTypes-2" document deploy

echo "=== notes-java-datatypes-3 ==="
npm run new-book -- notes-java-datatypes-3 "books/sources/Notes Java DataTypes-3.docx" "Notes Java DataTypes-3" document deploy

echo "=== notes-java-demo-1 ==="
npm run new-book -- notes-java-demo-1 "books/sources/Notes Java demo-1.docx" "Notes Java Demo-1" document deploy

echo "=== notes-java-demo-2 ==="
npm run new-book -- notes-java-demo-2 "books/sources/Notes Java demo-2.docx" "Notes Java Demo-2" document deploy

echo "=== notes-java-demo-3 ==="
npm run new-book -- notes-java-demo-3 "books/sources/Notes Java Demo-3.docx" "Notes Java Demo-3" document deploy

echo "=== notes-java-introduction-1 ==="
npm run new-book -- notes-java-introduction-1 "books/sources/Notes Java Introduction - 1.docx" "Notes Java Introduction-1" document deploy

echo "=== notes-java-introduction-3 ==="
npm run new-book -- notes-java-introduction-3 "books/sources/Notes Java Introduction-3.docx" "Notes Java Introduction-3" document deploy

echo "=== notes-java-methods-1 ==="
npm run new-book -- notes-java-methods-1 "books/sources/Notes Java Methods-1.docx" "Notes Java Methods-1" document deploy

echo "=== notes-java-operators-1 ==="
npm run new-book -- notes-java-operators-1 "books/sources/Notes Java Operators-1.docx" "Notes Java Operators-1" document deploy

echo "=== notes-java-operators-3 ==="
npm run new-book -- notes-java-operators-3 "books/sources/Notes Java Operators-3.docx" "Notes Java Operators-3" document deploy

echo "=== notes-java-variable-1 ==="
npm run new-book -- notes-java-variable-1 "books/sources/Notes Java Variable-1.docx" "Notes Java Variable-1" document deploy

echo "ALL DONE. Watch: https://github.com/StringStack-bengaluru/ClassNotes/actions"
echo "Missing source (skipped): notes-java-introduction-2"
