import { forwardRef, useEffect, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import type { FlipBookRef } from 'react-pageflip';
import { playPageFlipSound } from '../../services/pageFlipSound';
import type { BookManifest, FlatPage, ThemeMode } from '../../types/book';
import { BookPage } from './BookPage';
import { CoverFace } from './CoverFace';

export type CoverFlipMode = 'open' | 'close';

interface CoverPageFlipProps {
  manifest: BookManifest;
  chapterCount: number;
  totalPages: number;
  firstInnerPage: FlatPage | null;
  pageWidth: number;
  pageHeight: number;
  theme: ThemeMode;
  bookTitle: string;
  /** open = Start Learning; close = final End Session cover shut. */
  mode?: CoverFlipMode;
  onComplete: () => void;
}

const CoverFlipSlot = forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
  }
>(function CoverFlipSlot({ children }, ref) {
  return (
    <div ref={ref} className="h-full w-full overflow-hidden" data-density="soft">
      {children}
    </div>
  );
});

/**
 * One-shot cover open/close using the same HTMLFlipBook soft-flip as inside pages.
 * Does not handle reading — FlipBookReader owns that.
 */
export function CoverPageFlip({
  manifest,
  chapterCount,
  totalPages,
  firstInnerPage,
  pageWidth,
  pageHeight,
  theme,
  bookTitle,
  mode = 'open',
  onComplete,
}: CoverPageFlipProps) {
  const flipRef = useRef<FlipBookRef>(null);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const hasContent = chapterCount > 0 && totalPages > 0;
  const isClose = mode === 'close';

  onCompleteRef.current = onComplete;

  useEffect(() => {
    doneRef.current = false;

    const finishOnce = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onCompleteRef.current();
    };

    const timer = window.setTimeout(() => {
      try {
        const api = flipRef.current?.pageFlip();
        if (!api) {
          finishOnce();
          return;
        }
        if (isClose) {
          if (api.getCurrentPageIndex() !== 1) api.turnToPage(1);
          window.setTimeout(() => {
            try {
              // Cover shut after End Session rewind — soft close cue.
              playPageFlipSound({ force: true, mode: 'rapid' });
              api.flipPrev();
            } catch {
              finishOnce();
            }
          }, 40);
        } else {
          playPageFlipSound({ force: true });
          api.flipNext();
        }
      } catch {
        finishOnce();
      }
    }, 120);

    const fallback = window.setTimeout(finishOnce, 1600);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
    };
  }, [isClose]);

  const finish = (pageIndex: number) => {
    if (doneRef.current) return;
    if (isClose) {
      if (pageIndex > 0) return;
    } else if (pageIndex < 1) {
      return;
    }
    doneRef.current = true;
    onCompleteRef.current();
  };

  return (
    <div className="relative" style={{ width: pageWidth * 2, height: pageHeight }}>
      <HTMLFlipBook
        ref={flipRef}
        key={mode}
        width={pageWidth}
        height={pageHeight}
        size="fixed"
        minWidth={pageWidth}
        maxWidth={pageWidth}
        minHeight={pageHeight}
        maxHeight={pageHeight}
        drawShadow
        flippingTime={800}
        usePortrait={false}
        startPage={isClose ? 1 : 0}
        autoSize={false}
        maxShadowOpacity={0.5}
        showCover
        mobileScrollSupport
        clickEventForward={false}
        useMouseEvents={false}
        swipeDistance={30}
        showPageCorners={false}
        className="book-flip shadow-2xl"
        onFlip={(e) => finish(e.data)}
      >
        <CoverFlipSlot>
          <CoverFace
            manifest={manifest}
            chapterCount={chapterCount}
            totalPages={totalPages}
            hasContent={hasContent}
            isOpening={!isClose}
          />
        </CoverFlipSlot>

        <CoverFlipSlot>
          <div className="book-page h-full w-full">
            <BookPage
              page={firstInnerPage}
              zoom={1}
              theme={theme}
              isActive
              side="right"
              priority
              bookTitle={bookTitle}
            />
          </div>
        </CoverFlipSlot>

        <CoverFlipSlot>
          <div className="book-page h-full w-full">
            <BookPage
              page={null}
              zoom={1}
              theme={theme}
              isActive={false}
              side="left"
              bookTitle={bookTitle}
            />
          </div>
        </CoverFlipSlot>
      </HTMLFlipBook>
    </div>
  );
}
