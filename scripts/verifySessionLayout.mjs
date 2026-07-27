/**
 * Quick check for landscape End Session spread rules.
 * Run: node scripts/verifySessionLayout.mjs
 */

function wrapPages(contentCount, bookTitle = 'Notes Java Demo-1') {
  const contentPages = Array.from({ length: contentCount }, (_, i) => ({
    kind: 'content',
    chapterId: 'ch1',
    chapterTitle: bookTitle,
  }));

  const startPage = { kind: 'session-start' };
  const wrappedContent = contentPages.map((p) => ({ ...p, kind: 'content' }));
  const pagesBeforeEnd = [startPage, ...wrappedContent];
  const trailing = [];

  if (pagesBeforeEnd.length % 2 === 0) {
    trailing.push({ kind: 'qa-complete' });
  }

  trailing.push({ kind: 'session-end' });
  return [...pagesBeforeEnd, ...trailing];
}

function lastSpread(pages) {
  const n = pages.length;
  const left = pages[n - 2]?.kind ?? 'missing';
  const right = pages[n - 1]?.kind ?? 'missing';
  return `${left}|${right}`;
}

const cases = [
  { name: 'demo-1 style (2 content)', content: 2, expect: 'content|session-end' },
  { name: 'demo-3 style (3 content)', content: 3, expect: 'qa-complete|session-end' },
  { name: 'intro-2 style (19 content)', content: 19, expect: 'qa-complete|session-end' },
  { name: 'demo-2 style (6 content)', content: 6, expect: 'content|session-end' },
];

let failed = 0;
for (const c of cases) {
  const pages = wrapPages(c.content);
  const spread = lastSpread(pages);
  const ok = spread === c.expect;
  if (!ok) failed += 1;
  console.log(`${ok ? 'OK' : 'FAIL'} ${c.name}: [${spread}] (expected [${c.expect}])`);
}

if (failed > 0) {
  process.exit(1);
}

console.log('\nAll session layout checks passed.');
