import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  bookEase,
  bookMotionFlags,
  getBookSlideDistance,
} from '../config/bookMotion';
import { themeConfig } from '../config/theme';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { useTheme } from '../hooks/useTheme';
import type { BookManifest, FlatPage } from '../types/book';
import { FlipBookReader, type FlipBookHandle } from './book/FlipBookReader';

interface ReadingViewProps {
  manifest: BookManifest;
  pages: FlatPage[];
  initialPageIndex: number;
  isOpening?: boolean;
  isClosing?: boolean;
  onRequestClose: () => void;
  /** After rewind to page 0, hand off to the front cover. */
  onCloseComplete?: () => void;
}

/**
 * Immersive reading — no header toolbar.
 * Nav: arrow keys / swipe / page corners. Exit via End Session.
 *
 * End Session: rewind pages to the start → fade out → front cover (never back cover).
 */
export function ReadingView({
  manifest,
  pages,
  initialPageIndex,
  isOpening = false,
  isClosing = false,
  onRequestClose,
  onCloseComplete,
}: ReadingViewProps) {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const flipRef = useRef<FlipBookHandle>(null);
  const prefersReducedMotion = useReducedMotion();
  const polish = bookMotionFlags.USE_MOTION_POLISH;

  const [currentPageIndex, setCurrentPageIndex] = useState(initialPageIndex);
  /** 0 idle · 1 rewinding to start · 2 fading out to front cover */
  const [closePhase, setClosePhase] = useState(0);

  useReadingProgress({
    bookId: manifest.id,
    bookTitle: manifest.title,
    pages,
    currentPageIndex,
    enabled: true,
  });

  useEffect(() => {
    setCurrentPageIndex(initialPageIndex);
  }, [initialPageIndex]);

  useEffect(() => {
    if (!isClosing) {
      setClosePhase(0);
      return;
    }

    if (closePhase !== 0) return;

    if (prefersReducedMotion) {
      onCloseComplete?.();
      return;
    }

    setClosePhase(1);
    flipRef.current?.flipToStartRapid(() => {
      setClosePhase(2);
    });
  }, [isClosing, closePhase, prefersReducedMotion, onCloseComplete]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isClosing) return;
      if (e.key === 'ArrowRight') flipRef.current?.flipNext();
      if (e.key === 'ArrowLeft') flipRef.current?.flipPrev();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isClosing]);

  const requestCloseToCover = useCallback(() => {
    if (isClosing) return;
    if (prefersReducedMotion) {
      onRequestClose();
      onCloseComplete?.();
      return;
    }
    onRequestClose();
  }, [isClosing, onCloseComplete, onRequestClose, prefersReducedMotion]);

  const handleEndSession = useCallback(() => {
    requestCloseToCover();
  }, [requestCloseToCover]);

  const slide = getBookSlideDistance();
  const openingDuration = 1.75;

  return (
    <div
      className={clsx(
        'relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden',
        colors.bg,
        colors.text,
        colors.readerBg,
      )}
    >
      {polish && (
        <motion.div
          className="book-stage-vignette"
          initial={false}
          animate={{ opacity: isClosing ? 1 : isOpening ? 0.75 : 0 }}
          transition={{ duration: isOpening ? openingDuration : 0.35 }}
        />
      )}

      <div
        className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center justify-center p-2 md:p-4"
        style={{ perspective: '1600px' }}
      >
        <motion.div
          className="relative z-10 flex h-full max-h-[min(92vh,900px)] w-full items-center justify-center"
          style={{ transformOrigin: 'left center' }}
          initial={isOpening ? false : { x: slide, rotateY: -28, scale: 0.94, opacity: 0.55 }}
          animate={
            closePhase >= 2
              ? {
                  x: 0,
                  rotateY: 0,
                  scale: 0.96,
                  opacity: 0,
                }
              : isOpening
                ? {
                    x: [slide * 1.02, slide * 0.78, slide * 0.38, 0],
                    y: [18, 10, 4, 0],
                    rotateY: [-82, -58, -24, 0],
                    scale: [1.045, 1.03, 1.012, 1],
                    opacity: [0.04, 0.18, 0.58, 1],
                  }
              : {
                  x: 0,
                  y: 0,
                  rotateY: 0,
                  scale: 1,
                  opacity: 1,
                }
          }
          transition={
            closePhase >= 2
              ? { duration: 0.55, ease: bookEase }
              : isOpening
                ? {
                    duration: openingDuration,
                    times: [0, 0.2, 0.58, 1],
                    ease: bookEase,
                  }
                : { duration: 0.75, ease: bookEase }
          }
          onAnimationComplete={() => {
            if (closePhase === 2) onCloseComplete?.();
          }}
        >
          <FlipBookReader
            ref={flipRef}
            pages={pages}
            currentIndex={currentPageIndex}
            onPageChange={setCurrentPageIndex}
            zoom={1}
            theme={theme}
            bookTitle={manifest.title}
            onEndSession={handleEndSession}
          />
        </motion.div>
      </div>
    </div>
  );
}
