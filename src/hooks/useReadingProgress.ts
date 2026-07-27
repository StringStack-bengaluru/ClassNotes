import { useCallback, useEffect, useRef } from 'react';
import { addRecentlyRead, loadProgress, saveProgress } from '../services/progressStorage';
import type { FlatPage, ReadingProgress } from '../types/book';

interface UseReadingProgressOptions {
  bookId: string;
  bookTitle: string;
  pages: FlatPage[];
  currentPageIndex: number;
  enabled: boolean;
}

export function useReadingProgress({
  bookId,
  bookTitle,
  pages,
  currentPageIndex,
  enabled,
}: UseReadingProgressOptions) {
  const initialLoaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSavedPage = useCallback((): number => {
    const saved = loadProgress(bookId);
    return saved?.globalPageIndex ?? 0;
  }, [bookId]);

  const persist = useCallback(
    (pageIndex: number) => {
      if (!enabled || pages.length === 0) return;

      const page = pages[pageIndex];
      if (!page) return;

      const progress: ReadingProgress = {
        bookId,
        globalPageIndex: pageIndex,
        chapterId: page.chapterId,
        updatedAt: new Date().toISOString(),
        percentComplete: Math.round(((pageIndex + 1) / pages.length) * 100),
      };

      saveProgress(progress);
      addRecentlyRead({
        bookId,
        title: bookTitle,
        globalPageIndex: pageIndex,
        visitedAt: new Date().toISOString(),
      });
    },
    [bookId, bookTitle, enabled, pages],
  );

  useEffect(() => {
    if (!enabled || initialLoaded.current) return;

    initialLoaded.current = true;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(currentPageIndex), 400);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [currentPageIndex, enabled, persist]);

  const percentComplete =
    pages.length > 0 ? Math.round(((currentPageIndex + 1) / pages.length) * 100) : 0;

  return { getSavedPage, percentComplete };
}
