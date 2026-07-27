import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Layers, MapPin, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  bookEase,
  bookMotionFlags,
  getBookPageSize,
  getBookSlideDistance,
} from '../../config/bookMotion';
import { brand, brandColors } from '../../config/theme';
import type { BookManifest } from '../../types/book';
import { Button } from '../ui/Button';
import { BookBackCover } from './BookBackCover';

interface BookCoverProps {
  manifest: BookManifest;
  chapterCount: number;
  totalPages: number;
  savedPageIndex: number;
  isOpening?: boolean;
  /** After End Session, open covering the back face first. */
  initialShowBack?: boolean;
  onRequestOpen: (fromSaved?: boolean) => void;
  onOpenComplete?: () => void;
}

export function BookCover({
  manifest,
  chapterCount,
  totalPages,
  savedPageIndex: _savedPageIndex,
  isOpening = false,
  initialShowBack = false,
  onRequestOpen,
  onOpenComplete,
}: BookCoverProps) {
  const [showBack, setShowBack] = useState(initialShowBack);
  const [pageSize, setPageSize] = useState(() => getBookPageSize());
  const prefersReducedMotion = useReducedMotion();
  const hasContent = chapterCount > 0 && totalPages > 0;
  const slideDistance = getBookSlideDistance();
  const polish = bookMotionFlags.USE_MOTION_POLISH;
  const hingeOrigin = isOpening ? 'left center' : 'center center';
  const openingDuration = 1.75;

  useEffect(() => {
    setShowBack(initialShowBack);
  }, [initialShowBack]);

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

  const beginOpen = () => {
    if (isOpening) return;
    if (prefersReducedMotion) {
      onRequestOpen(false);
      onOpenComplete?.();
      return;
    }
    onRequestOpen(false);
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 md:p-8"
      style={{
        background: `linear-gradient(135deg, ${brandColors.bgGradientFrom} 0%, ${brandColors.bgGradientTo} 50%, ${brandColors.bg} 100%)`,
      }}
    >
      {polish && (
        <motion.div
          className="book-stage-vignette"
          initial={false}
          animate={{ opacity: isOpening ? 1 : 0 }}
          transition={{ duration: 0.55 }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative z-10 flex w-full max-w-5xl flex-col items-center"
      >
        <div
          className="pointer-events-none absolute -inset-8 rounded-[2rem] opacity-30 blur-3xl"
          style={{ background: brandColors.gold }}
        />

        <div className="relative flex justify-center" style={{ perspective: '1400px' }}>
          <motion.div
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              width: pageSize.width,
              height: pageSize.height,
              transformOrigin: hingeOrigin,
            }}
            animate={
              isOpening
                ? {
                    x: [0, slideDistance * 0.36, slideDistance * 0.72, slideDistance],
                    rotateY: [showBack ? 180 : 0, showBack ? 8 : -8, -38, -82],
                    scale: [1, 1.01, 1.03, 1.045],
                    y: [0, 6, 12, 18],
                  }
                : {
                    x: 0,
                    y: 0,
                    rotateY: showBack ? 180 : 0,
                    scale: 1,
                  }
            }
            transition={
              isOpening
                ? {
                    duration: openingDuration,
                    times: [0, 0.22, 0.62, 1],
                    ease: bookEase,
                  }
                : { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
            }
            onAnimationComplete={() => {
              if (isOpening) onOpenComplete?.();
            }}
          >
            {polish && (
              <motion.div
                className="book-contact-shadow"
                animate={
                  isOpening
                    ? { opacity: [0.55, 0.75, 0.35], scaleX: [1, 1.15, 1.35] }
                    : { opacity: 0.55, scaleX: 1 }
                }
                transition={{ duration: isOpening ? openingDuration : 0.4 }}
              />
            )}

            <div
              className="relative h-full w-full overflow-hidden rounded-r-md rounded-l-sm border border-zinc-700 shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                borderLeft: `4px solid ${brandColors.gold}`,
                background: `linear-gradient(160deg, ${brandColors.card} 0%, ${brandColors.bgGradientTo} 100%)`,
              }}
            >
              {polish && <div className="book-spine-highlight" />}
              <div className="flex h-full flex-col p-6 md:p-8">
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="h-8 w-auto max-w-[200px] object-contain md:h-9"
                />

                <h1 className="mt-5 font-serif text-2xl font-bold leading-tight text-white md:text-3xl">
                  {manifest.title}
                </h1>

                <p className="mt-2 font-serif text-base italic text-zinc-400 md:text-lg">
                  {manifest.subtitle}
                </p>

                <div className="mt-6 space-y-2.5 text-sm text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Layers size={16} style={{ color: brandColors.gold }} />
                    <span>{chapterCount} Chapters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} style={{ color: brandColors.gold }} />
                    <span>{totalPages} Pages</span>
                  </div>
                </div>

                {!hasContent && (
                  <p className="mt-4 text-sm text-zinc-500">
                    New chapters are added regularly. Check back soon.
                  </p>
                )}

                <div className="mt-auto space-y-4 border-t border-zinc-700/80 pt-5">
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <Phone size={16} className="mt-0.5 shrink-0" style={{ color: brandColors.gold }} />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Contact
                        </p>
                        <a
                          href={`tel:${brand.contactPhone}`}
                          className="font-medium text-white transition-colors hover:text-[#C6A43B]"
                        >
                          {brand.contactPhone}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: brandColors.gold }} />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Address
                        </p>
                        <p className="leading-relaxed text-zinc-300">{brand.contactAddress}</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full font-semibold shadow-lg"
                    style={{
                      background: brandColors.gold,
                      color: brandColors.textOnGold,
                    }}
                    disabled={isOpening}
                    onClick={(event) => {
                      event.stopPropagation();
                      beginOpen();
                    }}
                  >
                    {isOpening ? 'Opening…' : 'Start Learning'}
                  </Button>
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 overflow-hidden rounded-l-md rounded-r-sm border border-zinc-700 shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                borderRight: `4px solid ${brandColors.gold}`,
              }}
            >
              <BookBackCover />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
