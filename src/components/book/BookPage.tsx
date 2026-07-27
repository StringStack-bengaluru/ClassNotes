import clsx from 'clsx';
import { memo, useEffect, useRef, useState } from 'react';
import { preloadPdfPages, renderPdfPageToCanvas } from '../../services/pdfService';
import type { FlatPage, ThemeMode } from '../../types/book';
import { themeConfig } from '../../config/theme';
import { QaCompletePage } from './QaCompletePage';
import { QaContentPage } from './QaContentPage';
import { SessionPage } from './SessionPage';

interface PdfPageCanvasProps {
  page: FlatPage;
  zoom: number;
  theme: ThemeMode;
  isActive: boolean;
  priority?: boolean;
}

export const PdfPageCanvas = memo(function PdfPageCanvas({
  page,
  zoom,
  theme,
  isActive,
  priority = false,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const colors = themeConfig[theme];

  useEffect(() => {
    if (!isActive && !priority) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    const scale = 1.4 * zoom;

    void renderPdfPageToCanvas(page.pdfUrl, page.pageInChapter, canvas, scale)
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isActive, page.pdfUrl, page.pageInChapter, priority, zoom]);

  return (
    <div className={clsx('relative flex h-full w-full flex-col overflow-hidden', colors.paper)}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/[0.03] via-transparent to-black/[0.06]" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C6A43B] border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-stone-500">
          Unable to load page content
        </div>
      )}

      <div className="flex flex-1 items-center justify-center overflow-hidden p-3 md:p-5">
        <canvas
          ref={canvasRef}
          className={clsx(
            'max-h-full max-w-full object-contain shadow-sm transition-opacity duration-300',
            loading ? 'opacity-0' : 'opacity-100',
          )}
        />
      </div>
    </div>
  );
});

interface BookPageProps {
  page: FlatPage | null;
  zoom: number;
  theme: ThemeMode;
  isActive: boolean;
  side: 'left' | 'right';
  priority?: boolean;
  bookTitle?: string;
  onEndSession?: () => void;
}

export const BookPage = memo(function BookPage({
  page,
  zoom,
  theme,
  isActive,
  side,
  priority,
  bookTitle,
  onEndSession,
}: BookPageProps) {
  const colors = themeConfig[theme];

  if (!page) {
    return (
      <div
        className={clsx(
          'flex h-full w-full items-center justify-center',
          colors.paper,
          colors.paperBorder,
          side === 'left' ? 'rounded-l-sm border-r' : 'rounded-r-sm',
        )}
      />
    );
  }

  if (page.kind === 'qa-complete') {
    return (
      <div
        className={clsx(
          'h-full w-full overflow-hidden',
          colors.paperBorder,
          side === 'left' ? 'rounded-l-sm border-r' : 'rounded-r-sm',
        )}
      >
        <QaCompletePage theme={theme} bookTitle={bookTitle} />
      </div>
    );
  }

  if (page.kind === 'session-start' || page.kind === 'session-end') {
    return (
      <div
        className={clsx(
          'h-full w-full overflow-hidden',
          colors.paperBorder,
          side === 'left' ? 'rounded-l-sm border-r' : 'rounded-r-sm',
        )}
      >
        <SessionPage page={page} theme={theme} bookTitle={bookTitle} onEndSession={onEndSession} />
      </div>
    );
  }

  if (page.contentMode === 'qa') {
    return (
      <div
        className={clsx(
          'h-full w-full overflow-hidden',
          colors.paperBorder,
          side === 'left' ? 'rounded-l-sm border-r' : 'rounded-r-sm',
        )}
      >
        <QaContentPage page={page} theme={theme} bookTitle={bookTitle} />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'h-full w-full overflow-hidden',
        colors.paperBorder,
        side === 'left' ? 'rounded-l-sm border-r' : 'rounded-r-sm',
      )}
    >
      <PdfPageCanvas page={page} zoom={zoom} theme={theme} isActive={isActive} priority={priority} />
    </div>
  );
});

export function preloadNearbyPages(pages: FlatPage[], centerIndex: number, zoom: number): void {
  const indices = [centerIndex - 2, centerIndex - 1, centerIndex, centerIndex + 1, centerIndex + 2];

  for (const index of indices) {
    const page = pages[index];
    if (!page || page.kind !== 'content') continue;
    if (page.contentMode === 'qa' || !page.pdfUrl) continue;
    preloadPdfPages(page.pdfUrl, [page.pageInChapter], 1.4 * zoom);
  }
}
