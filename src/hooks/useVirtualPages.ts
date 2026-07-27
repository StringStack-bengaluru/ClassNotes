import { useMemo } from 'react';
import type { FlatPage } from '../types/book';

/** Number of physical flip-book slots kept in DOM for performance */
export const VIRTUAL_WINDOW_SIZE = 10;

/** Pages around current index to eagerly preload */
export const PRELOAD_BUFFER = 3;

export function useVirtualWindow(currentIndex: number, totalPages: number) {
  const windowStart = useMemo(() => {
    const half = Math.floor(VIRTUAL_WINDOW_SIZE / 2);
    return Math.max(0, Math.min(currentIndex - half, totalPages - VIRTUAL_WINDOW_SIZE));
  }, [currentIndex, totalPages]);

  const windowEnd = useMemo(
    () => Math.min(totalPages, windowStart + VIRTUAL_WINDOW_SIZE),
    [totalPages, windowStart],
  );

  const preloadIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = currentIndex - PRELOAD_BUFFER; i <= currentIndex + PRELOAD_BUFFER; i += 1) {
      if (i >= 0 && i < totalPages) indices.push(i);
    }
    return indices;
  }, [currentIndex, totalPages]);

  return { windowStart, windowEnd, preloadIndices };
}

export function shouldRenderPage(globalIndex: number, windowStart: number, windowEnd: number): boolean {
  return globalIndex >= windowStart && globalIndex < windowEnd;
}

export function getPageAtIndex(pages: FlatPage[], index: number): FlatPage | undefined {
  return pages[index];
}
