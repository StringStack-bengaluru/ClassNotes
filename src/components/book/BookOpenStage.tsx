import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { bookEase, bookMotionFlags, getBookPageSize } from '../../config/bookMotion';
import { brandColors, themeConfig } from '../../config/theme';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { useTheme } from '../../hooks/useTheme';
import { bindPageFlipSoundUnlock } from '../../services/pageFlipSound';
import type { BookManifest, FlatPage } from '../../types/book';
import { CoverFace } from './CoverFace';
import { CoverPageFlip } from './CoverPageFlip';
import { FlipBookReader, type FlipBookHandle } from './FlipBookReader';

interface BookOpenStageProps {
  manifest: BookManifest;
  pages: FlatPage[];
  chapterCount: number;
  totalPages: number;
  initialPageIndex: number;
  showCover: boolean;
  isOpening: boolean;
  isClosing: boolean;
  onRequestOpen: (fromSaved?: boolean) => void;
  onOpenComplete: () => void;
  onRequestClose: () => void;
  onCloseComplete: () => void;
}

/**
 * Closed cover = CoverFace.
 * Cover open/close = CoverPageFlip (same soft flip as inside pages).
 * Inside reading = original FlipBookReader.
 *
 * End Session: rapid rewind to first page → cover page-flip shut → closed cover.
 */
export function BookOpenStage({
  manifest,
  pages,
  chapterCount,
  totalPages,
  initialPageIndex,
  showCover,
  isOpening,
  isClosing,
  onRequestOpen,
  onOpenComplete,
  onRequestClose,
  onCloseComplete,
}: BookOpenStageProps) {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const flipRef = useRef<FlipBookHandle>(null);
  const prefersReducedMotion = useReducedMotion();
  const polish = bookMotionFlags.USE_MOTION_POLISH;
  const hasContent = chapterCount > 0 && totalPages > 0;

  const [pageSize, setPageSize] = useState(() => getBookPageSize());
  const [currentPageIndex, setCurrentPageIndex] = useState(initialPageIndex);
  /** 0 idle · 1 rewinding pages · 2 cover soft-flip shut */
  const [closePhase, setClosePhase] = useState(0);

  const showClosedCover = showCover && !isOpening && !isClosing;
  const showCoverOpenFlip = isOpening;
  const showCoverCloseFlip = isClosing && closePhase === 2;
  // Keep FlipBook mounted through phase 0→1 so rewind can run; hide only for cover shut.
  const showInnerBook =
    (!showCover && !isOpening && !isClosing) || (isClosing && closePhase <= 1);
  const isReading = !showCover && !isOpening && !isClosing;

  useReadingProgress({
    bookId: manifest.id,
    bookTitle: manifest.title,
    pages,
    currentPageIndex,
    enabled: isReading,
  });

  useEffect(() => bindPageFlipSoundUnlock(), []);

  useEffect(() => {
    setCurrentPageIndex(initialPageIndex);
  }, [initialPageIndex]);

  useEffect(() => {
    const syncSize = () => {
      const next = getBookPageSize();
      setPageSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };
    syncSize();
    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
  }, []);

  useEffect(() => {
    if (!isClosing) {
      setClosePhase(0);
      return;
    }

    if (prefersReducedMotion) {
      onCloseComplete();
      return;
    }

    // Step 1: mount/ensure FlipBook, then rewind.
    if (closePhase === 0) {
      setClosePhase(1);
      return;
    }

    if (closePhase !== 1) return;

    let cancelled = false;
    const startRewind = () => {
      if (cancelled) return;
      const api = flipRef.current;
      if (!api) {
        // FlipBook not ready yet — retry once.
        window.setTimeout(() => {
          if (cancelled) return;
          if (flipRef.current) {
            flipRef.current.flipToStartRapid(() => {
              if (cancelled) return;
              setCurrentPageIndex(0);
              setClosePhase(2);
            });
          } else {
            setCurrentPageIndex(0);
            setClosePhase(2);
          }
        }, 50);
        return;
      }

      api.flipToStartRapid(() => {
        if (cancelled) return;
        setCurrentPageIndex(0);
        setClosePhase(2);
      });
    };

    const raf = window.requestAnimationFrame(startRewind);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [isClosing, closePhase, prefersReducedMotion, onCloseComplete]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isReading || isClosing) return;
      if (e.key === 'ArrowRight') flipRef.current?.flipNext();
      if (e.key === 'ArrowLeft') flipRef.current?.flipPrev();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isReading, isClosing]);

  const handleEndSession = useCallback(() => {
    if (isClosing) return;
    if (prefersReducedMotion) {
      onRequestClose();
      onCloseComplete();
      return;
    }
    onRequestClose();
  }, [isClosing, onCloseComplete, onRequestClose, prefersReducedMotion]);

  const beginOpen = useCallback(() => {
    if (isOpening) return;
    if (prefersReducedMotion) {
      onRequestOpen(false);
      onOpenComplete();
      return;
    }
    onRequestOpen(false);
  }, [isOpening, onOpenComplete, onRequestOpen, prefersReducedMotion]);

  const pageW = pageSize.width;
  const pageH = pageSize.height;
  const showCoverFlip = showCoverOpenFlip || showCoverCloseFlip;
  const stageWidth = showClosedCover ? pageW : pageW * 2;

  const stageBg =
    showClosedCover || showCoverFlip
      ? `linear-gradient(135deg, ${brandColors.bgGradientFrom} 0%, ${brandColors.bgGradientTo} 50%, ${brandColors.bg} 100%)`
      : undefined;

  return (
    <div
      className={clsx(
        'relative flex h-screen w-screen items-center justify-center overflow-hidden p-4 md:p-8',
        !stageBg && colors.bg,
        !stageBg && colors.text,
        !stageBg && colors.readerBg,
      )}
      style={stageBg ? { background: stageBg } : undefined}
    >
      {polish && (
        <motion.div
          className="book-stage-vignette"
          initial={false}
          animate={{ opacity: isClosing || showClosedCover || showCoverFlip ? 0.85 : 0 }}
          transition={{ duration: 0.45 }}
        />
      )}

      {showClosedCover && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] opacity-30 blur-3xl"
          style={{
            width: pageW + 64,
            height: pageH + 64,
            background: brandColors.gold,
          }}
          aria-hidden
        />
      )}

      <motion.div
        className="relative z-10"
        style={{ height: pageH }}
        initial={false}
        animate={{ width: stageWidth }}
        transition={{ duration: showCoverFlip ? 0.8 : 0.4, ease: bookEase }}
      >
        {showClosedCover && (
          <div className="relative" style={{ width: pageW, height: pageH }}>
            {polish && <div className="book-contact-shadow" />}
            <CoverFace
              manifest={manifest}
              chapterCount={chapterCount}
              totalPages={totalPages}
              hasContent={hasContent}
              onStartLearning={hasContent ? beginOpen : undefined}
            />
          </div>
        )}

        {showCoverOpenFlip && (
          <CoverPageFlip
            mode="open"
            manifest={manifest}
            chapterCount={chapterCount}
            totalPages={totalPages}
            firstInnerPage={pages[0] ?? null}
            pageWidth={pageW}
            pageHeight={pageH}
            theme={theme}
            bookTitle={manifest.title}
            onComplete={onOpenComplete}
          />
        )}

        {showCoverCloseFlip && (
          <CoverPageFlip
            mode="close"
            manifest={manifest}
            chapterCount={chapterCount}
            totalPages={totalPages}
            firstInnerPage={pages[0] ?? null}
            pageWidth={pageW}
            pageHeight={pageH}
            theme={theme}
            bookTitle={manifest.title}
            onComplete={onCloseComplete}
          />
        )}

        {showInnerBook && (
          <div className="relative h-full w-full" style={{ width: pageW * 2, height: pageH }}>
            <FlipBookReader
              ref={flipRef}
              pages={pages}
              currentIndex={currentPageIndex}
              onPageChange={setCurrentPageIndex}
              zoom={1}
              theme={theme}
              bookTitle={manifest.title}
              onEndSession={handleEndSession}
              embedded
              pageSize={pageSize}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
