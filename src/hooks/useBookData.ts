import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  countContentPages,
  enrichChapterWithContent,
  estimateReadingTimeMinutes,
  fetchBookManifest,
  flattenChaptersToPages,
  getChapterStartPages,
  wrapPagesWithSession,
} from '../services/bookApi';
import { getPdfPageCount } from '../services/pdfService';
import type { BookManifest, FlatPage } from '../types/book';

const POLL_INTERVAL_MS = 30_000;

interface UseBookDataResult {
  manifest: BookManifest | null;
  pages: FlatPage[];
  chapterStarts: Map<string, number>;
  totalPages: number;
  contentPageCount: number;
  chapterCount: number;
  readingTimeMinutes: number;
  loading: boolean;
  error: string | null;
  newChaptersAdded: number;
  dismissNewChapters: () => void;
  refetch: () => void;
}

function bookFingerprint(manifest: BookManifest, pages: FlatPage[]): string {
  return JSON.stringify({
    id: manifest.id,
    chapters: manifest.chapters.map((chapter) => ({
      id: chapter.id,
      contentMode: chapter.contentMode,
      contentUrl: chapter.contentUrl,
      pdfUrl: chapter.pdfUrl,
      pageCount: chapter.pageCount,
      itemsPerPage: chapter.itemsPerPage,
      qa: chapter.qaItems?.map((item) => [item.question, item.answer]),
      docPages: chapter.documentPages?.length,
    })),
    pages: pages.map((page) => ({
      kind: page.kind,
      pageInChapter: page.pageInChapter,
      contentMode: page.contentMode,
      qa: page.qaItems?.map((item) => [item.question, item.answer]),
      docBlocks: page.documentBlocks?.length,
      pdfUrl: page.pdfUrl,
    })),
  });
}

export function useBookData(): UseBookDataResult {
  const [manifest, setManifest] = useState<BookManifest | null>(null);
  const [pages, setPages] = useState<FlatPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newChaptersAdded, setNewChaptersAdded] = useState(0);
  const hasLoaded = useRef(false);
  const previousChapterCount = useRef(0);
  const fingerprintRef = useRef('');
  const loadInFlight = useRef(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (loadInFlight.current) return;
    loadInFlight.current = true;

    if (!options?.silent) {
      setLoading(!hasLoaded.current);
    }
    setError(null);

    try {
      const data = await fetchBookManifest();
      const chaptersWithCounts = await Promise.all(
        data.chapters.map(async (chapter) => {
          if (
            (chapter.contentMode === 'qa' || chapter.contentMode === 'document') &&
            chapter.contentUrl
          ) {
            return enrichChapterWithContent(chapter);
          }

          if (chapter.pageCount && chapter.pageCount > 0) {
            return { ...chapter, contentMode: chapter.contentMode ?? ('pdf' as const) };
          }
          if (!chapter.pdfUrl) {
            return { ...chapter, pageCount: chapter.pageCount ?? 1, contentMode: 'pdf' as const };
          }
          const count = await getPdfPageCount(chapter.pdfUrl);
          return { ...chapter, pageCount: count, contentMode: 'pdf' as const };
        }),
      );

      const enriched: BookManifest = {
        ...data,
        chapters: chaptersWithCounts,
        totalPages: chaptersWithCounts.reduce((sum, ch) => sum + (ch.pageCount ?? 0), 0),
      };

      const contentPages = flattenChaptersToPages(enriched);
      const nextPages = wrapPagesWithSession(enriched, contentPages);
      const nextFingerprint = bookFingerprint(enriched, nextPages);

      /** Avoid remounting the flipbook when polling finds no real change. */
      if (fingerprintRef.current === nextFingerprint) {
        return;
      }

      const nextCount = enriched.chapters.length;
      if (hasLoaded.current && nextCount > previousChapterCount.current) {
        setNewChaptersAdded(nextCount - previousChapterCount.current);
      }
      previousChapterCount.current = nextCount;
      fingerprintRef.current = nextFingerprint;

      setManifest(enriched);
      setPages(nextPages);
      hasLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load book');
    } finally {
      loadInFlight.current = false;
      setLoading(false);
    }
  }, []);

  const dismissNewChapters = useCallback(() => {
    setNewChaptersAdded(0);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => void load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!import.meta.hot) return;

    import.meta.hot.on('chapters-updated', () => {
      void load({ silent: true });
    });
  }, [load]);

  const chapterStarts = useMemo(() => getChapterStartPages(pages), [pages]);
  const totalPages = pages.length;
  const contentPageCount = useMemo(() => countContentPages(pages), [pages]);
  const chapterCount = manifest?.chapters.length ?? 0;
  const readingTimeMinutes = estimateReadingTimeMinutes(contentPageCount);

  return {
    manifest,
    pages,
    chapterStarts,
    totalPages,
    contentPageCount,
    chapterCount,
    readingTimeMinutes,
    loading,
    error,
    newChaptersAdded,
    dismissNewChapters,
    refetch: () => void load(),
  };
}
