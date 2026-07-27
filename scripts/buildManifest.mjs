import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertDocxChapters } from './docxToContent.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHAPTERS_DIR = path.join(ROOT, 'public', 'chapters');
const CONFIG_PATH = path.join(ROOT, 'content', 'book.config.json');
const MANIFEST_PATH = path.join(ROOT, 'public', 'api', 'book-manifest.json');
const QA_PER_PAGE = 2;

function humanize(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\.(pdf|docx|content\.json)$/i, '')
    .replace(/\.content$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseChapterFilename(filename) {
  const base = filename
    .replace(/\.content\.json$/i, '')
    .replace(/\.(pdf|docx)$/i, '');

  const dated = base.match(/^(\d{4}-\d{2}-\d{2})[-_.\s]+(.+)$/i);
  if (dated) {
    return {
      order: null,
      title: humanize(dated[2]),
      sortDate: dated[1],
    };
  }

  const numbered = base.match(/^(\d+)[-_.\s]+(.+)$/i);
  if (numbered) {
    return {
      order: Number.parseInt(numbered[1], 10),
      title: humanize(numbered[2]),
      sortDate: null,
    };
  }

  const chapterPrefix = base.match(/^chapter\s*(\d+)[-_.\s:]*(.*)$/i);
  if (chapterPrefix) {
    const rest = chapterPrefix[2].trim();
    return {
      order: Number.parseInt(chapterPrefix[1], 10),
      title: humanize(rest || `Chapter ${chapterPrefix[1]}`),
      sortDate: null,
    };
  }

  return {
    order: null,
    title: humanize(base),
    sortDate: null,
  };
}

function readBookConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Missing book config at ${CONFIG_PATH}`);
  }

  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function getFileAddedTime(stats) {
  const birthtime = stats.birthtimeMs;
  if (birthtime && birthtime > 0) return birthtime;
  return stats.mtimeMs;
}

function sortChapterFiles(files, sortMode) {
  const mode = sortMode ?? 'daily-append';
  const allNumbered = files.length > 0 && files.every((file) => file.order !== null);

  if (mode === 'numbered' || allNumbered) {
    return [...files].sort((a, b) => {
      const orderDiff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
      if (orderDiff !== 0) return orderDiff;
      return a.addedAtMs - b.addedAtMs;
    });
  }

  // daily-append: first uploaded = first chapter, each new PDF appends at the end
  return [...files].sort((a, b) => {
    if (a.sortDate && b.sortDate) {
      const dateDiff = a.sortDate.localeCompare(b.sortDate);
      if (dateDiff !== 0) return dateDiff;
    }
    return a.addedAtMs - b.addedAtMs;
  });
}

function scanChapterSources(sortMode) {
  if (!fs.existsSync(CHAPTERS_DIR)) {
    fs.mkdirSync(CHAPTERS_DIR, { recursive: true });
    return [];
  }

  const byBase = new Map();

  for (const filename of fs.readdirSync(CHAPTERS_DIR)) {
    const lower = filename.toLowerCase();
    const isPdf = lower.endsWith('.pdf');
    const isContent = lower.endsWith('.content.json');
    if (!isPdf && !isContent) continue;

    const base = isContent
      ? filename.replace(/\.content\.json$/i, '')
      : filename.replace(/\.pdf$/i, '');
    const filePath = path.join(CHAPTERS_DIR, filename);
    const stats = fs.statSync(filePath);
    const parsed = parseChapterFilename(filename);
    const existing = byBase.get(base) ?? {
      base,
      ...parsed,
      addedAtMs: getFileAddedTime(stats),
      uploadedAt: stats.mtime.toISOString(),
    };

    existing.addedAtMs = Math.min(existing.addedAtMs, getFileAddedTime(stats));
    if (stats.mtime > new Date(existing.uploadedAt)) {
      existing.uploadedAt = stats.mtime.toISOString();
    }

    if (isContent) {
      existing.contentFilename = filename;
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const items = Array.isArray(data.items) ? data.items : [];
        const perPage = Number(data.itemsPerPage) > 0 ? Number(data.itemsPerPage) : QA_PER_PAGE;
        existing.pageCount = Math.max(1, Math.ceil(items.length / perPage));
        if (typeof data.title === 'string' && data.title.trim()) {
          existing.title = data.title.trim();
        }
      } catch {
        existing.pageCount = 1;
      }
    } else {
      existing.pdfFilename = filename;
    }

    byBase.set(base, existing);
  }

  const files = [...byBase.values()].filter((file) => file.contentFilename || file.pdfFilename);
  return sortChapterFiles(files, sortMode);
}

export function buildManifest() {
  const config = readBookConfig();
  let sources = scanChapterSources(config.chapterSortMode);

  /**
   * One live book URL = one chapter. Leftover `.content.json` files from other
   * books in public/chapters must not concatenate (that restarts Question 1 mid-book).
   */
  if (config.singleBookMode && config.slug) {
    const slug = String(config.slug).toLowerCase();
    const matched = sources.filter((file) => file.base.toLowerCase() === slug);
    if (matched.length > 0) {
      sources = matched;
    } else {
      console.warn(
        `singleBookMode: no chapter matching slug "${config.slug}" — using all scanned sources`,
      );
    }
  }

  const chapters = sources.map((file, index) => {
    const linearOrder = index + 1;
    const title =
      config.singleBookMode && config.title
        ? config.title
        : file.title || `Chapter ${linearOrder}`;
    const idSource = file.contentFilename || file.pdfFilename || file.base;
    const chapter = {
      id: slugify(idSource) || `chapter-${linearOrder}`,
      title,
      order: linearOrder,
      uploadedAt: file.uploadedAt,
      filename: file.contentFilename || file.pdfFilename,
    };

    if (file.contentFilename) {
      chapter.contentUrl = `/chapters/${encodeURIComponent(file.contentFilename)}`;
      chapter.contentMode = 'qa';
      chapter.pageCount = file.pageCount ?? 1;
      chapter.pdfUrl = file.pdfFilename
        ? `/chapters/${encodeURIComponent(file.pdfFilename)}`
        : '';
    } else {
      chapter.pdfUrl = `/chapters/${encodeURIComponent(file.pdfFilename)}`;
      chapter.contentMode = 'pdf';
    }

    return chapter;
  });

  return {
    ...config,
    version: String(chapters.length),
    chapterCount: chapters.length,
    updatedAt: new Date().toISOString(),
    chapters,
    totalPages: undefined,
    ...(config.autoTitleFromFirstPdf && chapters.length === 1
      ? { title: chapters[0].title }
      : {}),
  };
}

export function writeManifest() {
  convertDocxChapters();
  const manifest = buildManifest();
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

export const paths = {
  ROOT,
  CHAPTERS_DIR,
  CONFIG_PATH,
  MANIFEST_PATH,
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = writeManifest();
  console.log(`Book manifest updated: ${manifest.chapters.length} chapter(s) — linear reading order`);
  for (const chapter of manifest.chapters) {
    console.log(`  ${chapter.order}. ${chapter.title} (${chapter.filename})`);
  }
}
