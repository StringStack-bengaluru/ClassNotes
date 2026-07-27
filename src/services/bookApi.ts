import type {
  BookChapter,
  BookManifest,
  ChapterContentFile,
  FlatPage,
  QAItem,
} from '../types/book';

/** Prefix public asset paths with Vite base (e.g. /TextBook/ on GitHub Pages). */
export function withBase(assetPath: string): string {
  if (!assetPath) return assetPath;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${assetPath.replace(/^\//, '')}`;
}

export async function fetchBookManifest(): Promise<BookManifest> {
  const response = await fetch(withBase('/api/book-manifest.json'), { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load book manifest: ${response.statusText}`);
  }

  const data = (await response.json()) as BookManifest;
  return {
    ...data,
    chapters: data.chapters.map((chapter) => ({
      ...chapter,
      pdfUrl: chapter.pdfUrl ? withBase(chapter.pdfUrl) : '',
      contentUrl: chapter.contentUrl ? withBase(chapter.contentUrl) : undefined,
    })),
  };
}

export async function fetchChapterContent(contentUrl: string): Promise<ChapterContentFile> {
  const response = await fetch(contentUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load chapter content: ${response.statusText}`);
  }
  return (await response.json()) as ChapterContentFile;
}

function chunkQAItems(items: QAItem[], perPage: number): QAItem[][] {
  const size = Math.max(1, perPage);
  const chunks: QAItem[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

/** Drop duplicate questions (same text after normalize) — keeps first occurrence. */
export function dedupeQAItems(items: QAItem[]): QAItem[] {
  const seen = new Set<string>();
  const unique: QAItem[] = [];

  for (const item of items) {
    const key = item.question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

export function flattenChaptersToPages(manifest: BookManifest): FlatPage[] {
  const pages: FlatPage[] = [];
  let globalIndex = 0;

  const sortedChapters = [...manifest.chapters].sort((a, b) => a.order - b.order);

  for (const chapter of sortedChapters) {
    if (chapter.contentMode === 'qa' && chapter.qaItems && chapter.qaItems.length > 0) {
      const perPage = chapter.itemsPerPage && chapter.itemsPerPage > 0 ? chapter.itemsPerPage : 2;
      const chunks = chunkQAItems(dedupeQAItems(chapter.qaItems), perPage);

      chunks.forEach((qaItems, index) => {
        pages.push({
          kind: 'content',
          globalIndex,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapterOrder: chapter.order,
          pageInChapter: index + 1,
          pdfUrl: chapter.pdfUrl ?? '',
          contentMode: 'qa',
          qaItems,
          contentPageTotal: chunks.length,
        });
        globalIndex += 1;
      });
      continue;
    }

    const pageCount = chapter.pageCount ?? 1;

    for (let pageInChapter = 1; pageInChapter <= pageCount; pageInChapter += 1) {
      pages.push({
        kind: 'content',
        globalIndex,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        pageInChapter,
        pdfUrl: chapter.pdfUrl,
        contentMode: 'pdf',
      });
      globalIndex += 1;
    }
  }

  return pages;
}

export function wrapPagesWithSession(manifest: BookManifest, contentPages: FlatPage[]): FlatPage[] {
  if (contentPages.length === 0) return contentPages;

  const chapterId = contentPages[0].chapterId;
  const bookTitle = manifest.title;

  const startPage: FlatPage = {
    kind: 'session-start',
    globalIndex: 0,
    chapterId,
    chapterTitle: bookTitle,
    chapterOrder: 0,
    pageInChapter: 0,
    pdfUrl: '',
  };

  const wrappedContent = contentPages.map((page, index) => ({
    ...page,
    kind: 'content' as const,
    globalIndex: index + 1,
  }));

  /**
   * Landscape spreads are [even|odd]. End Session must always be the last right page.
   * - Last Q&A on left  → pair [last Q&A | End Session]
   * - Last Q&A on right → pair [Q&A completed | End Session]
   */
  const pagesBeforeEnd: FlatPage[] = [startPage, ...wrappedContent];
  const trailing: FlatPage[] = [];

  if (pagesBeforeEnd.length % 2 === 0) {
    trailing.push({
      kind: 'qa-complete',
      globalIndex: pagesBeforeEnd.length,
      chapterId,
      chapterTitle: bookTitle,
      chapterOrder: 0,
      pageInChapter: 0,
      pdfUrl: '',
    });
  }

  const endPage: FlatPage = {
    kind: 'session-end',
    globalIndex: pagesBeforeEnd.length + trailing.length,
    chapterId,
    chapterTitle: 'End Session',
    chapterOrder: 0,
    pageInChapter: 0,
    pdfUrl: '',
  };

  return [...pagesBeforeEnd, ...trailing, endPage];
}

export function getChapterStartPages(pages: FlatPage[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const page of pages) {
    if (page.kind !== 'content') continue;
    if (!map.has(page.chapterId)) {
      map.set(page.chapterId, page.globalIndex);
    }
  }

  return map;
}

export function countContentPages(pages: FlatPage[]): number {
  return pages.filter((page) => page.kind === 'content').length;
}

export function estimateReadingTimeMinutes(totalPages: number, pagesPerMinute = 2): number {
  return Math.max(1, Math.ceil(totalPages / pagesPerMinute));
}

export async function enrichChapterWithContent(chapter: BookChapter): Promise<BookChapter> {
  if (chapter.contentMode === 'qa' && chapter.contentUrl) {
    const content = await fetchChapterContent(chapter.contentUrl);
    const items = dedupeQAItems(Array.isArray(content.items) ? content.items : []);
    const perPage = content.itemsPerPage && content.itemsPerPage > 0 ? content.itemsPerPage : 2;
    return {
      ...chapter,
      qaItems: items,
      itemsPerPage: perPage,
      pageCount: Math.max(1, Math.ceil(items.length / perPage)),
      contentMode: 'qa',
    };
  }

  return { ...chapter, contentMode: chapter.contentMode ?? 'pdf' };
}
