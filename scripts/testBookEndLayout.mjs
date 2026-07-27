/**
 * Integration check using real chapter JSON from a book branch.
 * Run: node scripts/testBookEndLayout.mjs java-demo-1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const slug = process.argv[2] || 'java-demo-1';

function flattenContent(content, chapterId, chapterTitle) {
  const perPage = content.itemsPerPage && content.itemsPerPage > 0 ? content.itemsPerPage : 2;
  const items = content.items ?? [];
  const pages = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push({
      kind: 'content',
      chapterId,
      chapterTitle,
      pageInChapter: Math.floor(i / perPage) + 1,
      contentMode: 'qa',
    });
  }
  return pages;
}

function wrapPagesWithSession(bookTitle, contentPages) {
  const chapterId = contentPages[0]?.chapterId ?? 'ch1';
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const contentPath = path.join(ROOT, 'public', 'chapters', `${slug}.content.json`);
const configPath = path.join(ROOT, 'content', 'book.config.json');

if (!fs.existsSync(contentPath)) {
  console.error(`Missing ${contentPath}. Checkout book/${slug} first.`);
  process.exit(1);
}

const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : { title: slug };

const contentPages = flattenContent(content, slug, config.title);
const pages = wrapPagesWithSession(config.title, contentPages);
const lastLeft = pages[pages.length - 2]?.kind;
const lastRight = pages[pages.length - 1]?.kind;

console.log(`Book: ${config.title}`);
console.log(`Content pages: ${contentPages.length}`);
console.log(`Total pages: ${pages.length}`);
console.log(`Final spread: [${lastLeft} | ${lastRight}]`);

assert(lastRight === 'session-end', 'End Session must be on the right');
assert(
  lastLeft === 'content' || lastLeft === 'qa-complete',
  `Unexpected left page kind: ${lastLeft}`,
);

const hasDayLabel = JSON.stringify({ content, config }).match(/Day-0\d Session/i);
assert(!hasDayLabel, 'DAY session label should not appear in book data');

console.log('PASS');
