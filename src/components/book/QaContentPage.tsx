import clsx from 'clsx';
import { brand, brandColors, themeConfig } from '../../config/theme';
import type { FlatPage, ThemeMode } from '../../types/book';
import { BookRichText } from './BookRichText';

interface QaContentPageProps {
  page: FlatPage;
  theme: ThemeMode;
  bookTitle?: string;
}

/**
 * One FlipBook page showing exactly (up to) two Q&As — centered, clear, neat.
 */
export function QaContentPage({ page, theme, bookTitle }: QaContentPageProps) {
  const colors = themeConfig[theme];
  const items = page.qaItems ?? [];
  const title = bookTitle || page.chapterTitle;
  const pageLabel = page.contentPageTotal
    ? `${page.pageInChapter}`
    : String(page.pageInChapter);

  return (
    <div
      className={clsx(
        'relative flex h-full w-full flex-col overflow-hidden',
        colors.paper,
        colors.text,
      )}
    >
      <header
        className={clsx(
          'relative z-10 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 md:px-6 md:py-3',
          colors.paper,
          colors.paperBorder,
        )}
      >
        <img
          src={theme === 'dark' ? brand.logo : brand.logoOnLight}
          alt={brand.name}
          className="h-5 w-auto max-w-[120px] shrink-0 object-contain object-left opacity-90 md:h-6"
        />
        <p
          className="min-w-0 truncate text-right text-[10px] font-medium tracking-wide md:text-[11px]"
          style={{ color: brandColors.gold }}
        >
          {title}
        </p>
      </header>

      <div className="book-page-scroll relative z-0 min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-7 md:py-4">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-5 md:gap-6">
          {items.map((item, index) => {
            const number = (page.pageInChapter - 1) * 2 + index + 1;
            return (
              <article key={`${page.pageInChapter}-${index}`} className="text-center">
                <p
                  className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: brandColors.gold }}
                >
                  Question {number}
                </p>
                <h3 className="font-serif text-[15px] font-bold leading-snug md:text-base">{item.question}</h3>
                <div
                  className="mx-auto mt-2 mb-2.5 h-px w-8"
                  style={{ background: brandColors.gold }}
                />
                <BookRichText
                  text={item.answer}
                  theme={theme}
                  className={clsx('text-[13px] leading-relaxed md:text-sm', colors.muted)}
                />
              </article>
            );
          })}
        </div>
      </div>

      <footer
        className={clsx(
          'relative z-10 grid shrink-0 grid-cols-3 items-center gap-2 border-t px-4 py-2 text-[9px] md:px-6',
          colors.paper,
          colors.paperBorder,
          colors.muted,
        )}
      >
        <a href={`tel:${brand.contactPhone}`} className="justify-self-start hover:opacity-80">
          {brand.contactPhone}
        </a>
        <p
          className="justify-self-center font-medium tabular-nums"
          style={{ color: brandColors.gold }}
        >
          {pageLabel}
        </p>
        <span className="justify-self-end" aria-hidden />
      </footer>
    </div>
  );
}
