import clsx from 'clsx';
import { brand, brandColors, themeConfig } from '../../config/theme';
import type { FlatPage, ThemeMode } from '../../types/book';
import { DocumentBlocks } from './DocumentBlocks';

interface DocumentContentPageProps {
  page: FlatPage;
  theme: ThemeMode;
  bookTitle?: string;
}

/**
 * Flip-book page for formatted DOCX document mode (parallel to QaContentPage).
 * Preserves paragraph / line breaks from structured blocks — does not join prose.
 */
export function DocumentContentPage({ page, theme, bookTitle }: DocumentContentPageProps) {
  const colors = themeConfig[theme];
  const blocks = page.documentBlocks ?? [];
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

      <div className="book-page-scroll relative z-0 min-h-0 flex-1 overflow-y-auto px-4 py-3 font-serif md:px-6 md:py-4">
        {blocks.length === 0 ? (
          <p className={clsx('text-center text-sm', colors.muted)}>No content on this page</p>
        ) : (
          <DocumentBlocks blocks={blocks} theme={theme} />
        )}
      </div>

      <footer
        className={clsx(
          'relative z-10 flex shrink-0 items-center justify-between border-t px-4 py-2 text-[10px] md:px-6',
          colors.paperBorder,
          colors.muted,
        )}
      >
        <span>8050749191</span>
        <span>{pageLabel}</span>
      </footer>
    </div>
  );
}
