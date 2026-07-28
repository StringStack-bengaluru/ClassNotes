import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paths, writeManifest } from './buildManifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'books', 'registry.json');
const SOURCES_DIR = path.join(ROOT, 'books', 'sources');
const PAGES_BASE = 'https://stringstack-bengaluru.github.io/ClassNotes';
const GITHUB_BASE = 'https://github.com/StringStack-bengaluru/ClassNotes';
/** Push book branches here — override with BOOK_REMOTE if needed. */
const GIT_REMOTE = process.env.BOOK_REMOTE || 'stringstack';

function run(command, options = {}) {
  execSync(command, { cwd: ROOT, stdio: 'inherit', ...options });
}

function runCapture(command) {
  return execSync(command, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function parseArgs(argv) {
  const args = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--slug') args.slug = argv[++i];
    else if (token === '--title') args.title = argv[++i];
    else if (token === '--pdf') args.pdf = argv[++i];
    else if (token === '--docx') args.docx = argv[++i];
    else if (token === '--push' || token === 'push') args.push = true;
    else if (token === '--deploy' || token === 'deploy') args.deploy = true;
    else if (token === '--document' || token === 'document') args.document = true;
    else if (token === '--no-commit') args.noCommit = true;
    else if (token.startsWith('--')) {
      console.error(`Unknown flag: ${token}`);
      process.exit(1);
    } else {
      positionals.push(token);
    }
  }

  /**
   * npm on Windows often strips `--slug` / `--docx` (treats them as npm config).
   * Positional form always works:
   *   npm run new-book -- 05-day-05 "books/sources/Day-05.docx" "Day 05 Session" deploy
   */
  if (!args.slug && positionals[0]) args.slug = positionals[0];
  if (!args.docx && !args.pdf && positionals[1]) {
    const source = positionals[1];
    if (/\.pdf$/i.test(source)) args.pdf = source;
    else args.docx = source;
  }
  if (!args.title && positionals[2] && !['push', 'deploy', 'document'].includes(positionals[2])) {
    args.title = positionals[2];
  }
  // Allow: npm run new-book -- slug docx title document deploy
  if (positionals.includes('document')) args.document = true;

  if (args.deploy) args.push = true;
  return args;
}

function readRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return { books: [] };
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function writeRegistry(registry) {
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
}

function clearChapterSources() {
  for (const file of fs.readdirSync(paths.CHAPTERS_DIR)) {
    const lower = file.toLowerCase();
    if (
      lower.endsWith('.pdf') ||
      lower.endsWith('.docx') ||
      lower.endsWith('.content.json') ||
      lower.endsWith('.document.json')
    ) {
      fs.unlinkSync(path.join(paths.CHAPTERS_DIR, file));
    }
  }
  const mediaRoot = path.join(paths.CHAPTERS_DIR, 'media');
  if (fs.existsSync(mediaRoot)) {
    fs.rmSync(mediaRoot, { recursive: true, force: true });
  }
}

function resolveSourcePath(sourceArg, extension) {
  const withExt = sourceArg.toLowerCase().endsWith(extension) ? sourceArg : `${sourceArg}${extension}`;
  const candidates = [
    path.resolve(ROOT, sourceArg),
    path.resolve(ROOT, withExt),
    path.join(SOURCES_DIR, sourceArg),
    path.join(SOURCES_DIR, withExt),
    path.join(paths.CHAPTERS_DIR, sourceArg),
    path.join(paths.CHAPTERS_DIR, withExt),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Source file not found: ${sourceArg}`);
}

function titleFromSource(filePath) {
  const base = path.basename(filePath, path.extname(filePath)).replace(/\.content$/i, '');
  return base.trim();
}

function humanizeTitle(filePath) {
  return titleFromSource(filePath).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function dayFromSlug(slug) {
  const match = slug.match(/^(\d+)/);
  return match ? match[1].padStart(2, '0') : '01';
}

function archiveSource(sourcePath, slug, mode) {
  fs.mkdirSync(SOURCES_DIR, { recursive: true });
  const ext = mode === 'docx' ? '.docx' : '.pdf';
  const archivePath = path.join(SOURCES_DIR, `${slug}${ext}`);
  fs.copyFileSync(sourcePath, archivePath);
  return archivePath;
}

function setupBook({ slug, title, sourcePath, mode, readerMode }) {
  const day = dayFromSlug(slug);
  const bookTitle = title || titleFromSource(sourcePath);
  const sourceExt = mode === 'docx' ? '.docx' : '.pdf';
  const chapterFilename = `${slug}${sourceExt}`;

  clearChapterSources();
  fs.copyFileSync(sourcePath, path.join(paths.CHAPTERS_DIR, chapterFilename));

  const config = {
    id: `stringstack-${slug}`,
    slug,
    title: bookTitle,
    subtitle: 'StringStack.ai',
    author: 'StringStack Content Team',
    publisher: 'StringStack.ai',
    coverColor: '#252525',
    accentColor: '#C6A43B',
    autoTitleFromFirstPdf: false,
    chapterSortMode: 'numbered',
    singleBookMode: true,
    /** `qa` (default) keeps current Q&A books. `document` = formatted DOCX reader. */
    readerMode: readerMode === 'document' ? 'document' : 'qa',
  };

  fs.writeFileSync(paths.CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  const manifest = writeManifest();

  manifest.title = bookTitle;
  if (manifest.chapters[0]) {
    manifest.chapters[0].title = bookTitle;
  }
  fs.writeFileSync(paths.MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const registry = readRegistry();
  const branch = `book/${slug}`;
  const existing = registry.books.find((book) => book.slug === slug);
  const entry = {
    slug,
    branch,
    title: bookTitle,
    source: chapterFilename,
    githubUrl: `${GITHUB_BASE}/tree/${branch}`,
    pagesUrl: `${PAGES_BASE}/${slug}/`,
    readerMode: config.readerMode,
  };
  if (mode === 'pdf') entry.pdf = chapterFilename;
  if (mode === 'docx') entry.docx = chapterFilename;

  if (existing) Object.assign(existing, entry);
  else registry.books.push(entry);

  registry.books.sort((a, b) => a.slug.localeCompare(b.slug));
  writeRegistry(registry);

  return { manifest, branch, entry, bookTitle };
}

function syncRegistryToMain(slug, bookTitle) {
  const registrySnapshot = fs.readFileSync(REGISTRY_PATH, 'utf8');
  run('git checkout main');
  fs.writeFileSync(REGISTRY_PATH, registrySnapshot, 'utf8');
  run('git add books/registry.json');

  const status = runCapture('git status --porcelain books/registry.json');
  if (status) {
    run(`git commit -m "Register book ${slug}: ${bookTitle}"`);
  } else {
    run(`git commit --allow-empty -m "Deploy books including ${slug}"`);
  }
}

function printUrls(entry, branch) {
  console.log('');
  console.log('========================================');
  console.log(' BOOK READY');
  console.log('========================================');
  console.log(`  Title:   ${entry.title}`);
  console.log(`  Branch:  ${branch}`);
  console.log(`  GitHub:  ${entry.githubUrl}`);
  console.log(`  Live:    ${entry.pagesUrl}`);
  console.log('========================================');
  console.log('');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug || (!args.pdf && !args.docx)) {
    console.error(`Usage (Windows / npm — preferred):
  npm run new-book -- 05-day-05 "books/sources/Day-05.docx" "Day 05 Session" deploy

Formatted document mode (preserves paragraphs — parallel to Q&A):
  npm run new-book -- 05-day-05 "books/sources/Day-05.docx" "Day 05 Session" document deploy

Or call node directly (flags work):
  node scripts/create-book-branch.mjs --slug 05-day-05 --docx "books/sources/Day-05.docx" --title "Day 05 Session" --deploy

Args:
  1 slug     Required (e.g. 05-day-05)
  2 docx     Path to today's .docx (or .pdf)
  3 title    Optional display title
  document   Optional — formatted DOCX reader (does not replace default Q&A)
  deploy     Optional — push book branch + push main (triggers Pages)
  push       Optional — push book branch only
`);
    process.exit(1);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(args.slug)) {
    console.error('Invalid --slug. Use lowercase letters, numbers, and hyphens only (e.g. 05-day-05).');
    process.exit(1);
  }

  const mode = args.docx ? 'docx' : 'pdf';
  const sourcePath = resolveSourcePath(args.docx || args.pdf, mode === 'docx' ? '.docx' : '.pdf');
  const tempCopy = path.join(ROOT, `.tmp-book-source${path.extname(sourcePath)}`);
  fs.copyFileSync(sourcePath, tempCopy);
  archiveSource(sourcePath, args.slug, mode);

  const title = args.title || humanizeTitle(sourcePath);
  const branch = `book/${args.slug}`;

  run('git checkout main');
  try {
    run(`git checkout -B ${branch}`);
  } catch {
    run(`git checkout ${branch}`);
  }

  const { entry, bookTitle } = setupBook({
    slug: args.slug,
    title,
    sourcePath: tempCopy,
    mode,
    readerMode: args.document ? 'document' : 'qa',
  });

  fs.unlinkSync(tempCopy);

  if (!args.noCommit) {
    run(
      'git add content/book.config.json public/chapters public/api/book-manifest.json books/registry.json',
    );
    run(`git commit -m "Add book branch ${args.slug}: ${bookTitle}"`);
  }

  printUrls(entry, branch);

  if (args.push) {
    run(`git push -u ${GIT_REMOTE} ${branch} --force-with-lease`);
    console.log(`Pushed ${branch} to ${GIT_REMOTE}`);
  } else {
    console.log(`Next: git push -u ${GIT_REMOTE} ${branch} --force-with-lease`);
  }

  if (args.deploy) {
    console.log('');
    console.log('Triggering GitHub Pages deploy via main…');
    syncRegistryToMain(args.slug, bookTitle);
    run(`git push ${GIT_REMOTE} main`);
    console.log('');
    console.log('Deploy started. Watch:');
    console.log(`  ${GITHUB_BASE}/actions`);
    console.log('');
    console.log('Live URL (ready in ~2–5 min):');
    console.log(`  ${entry.pagesUrl}`);
  } else if (args.push) {
    console.log('');
    console.log('Book branch pushed, but Pages is NOT live yet.');
    console.log('Deploy manually:');
    console.log('  git checkout main');
    console.log(`  git commit --allow-empty -m "Deploy books including ${args.slug}"`);
    console.log(`  git push ${GIT_REMOTE} main`);
    console.log('');
    console.log('Or re-run with --deploy next time.');
  }
}

main();
