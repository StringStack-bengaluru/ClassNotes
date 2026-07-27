import clsx from 'clsx';
import { brand, brandColors, themeConfig } from '../../config/theme';
import type { FlatPage, ThemeMode } from '../../types/book';

interface SessionPageProps {
  page: FlatPage;
  theme: ThemeMode;
  bookTitle?: string;
  onEndSession?: () => void;
}

export function SessionPage({ page, theme, bookTitle, onEndSession }: SessionPageProps) {
  const colors = themeConfig[theme];
  const title = bookTitle || page.chapterTitle;

  if (page.kind === 'session-start') {
    return (
      <div
        className={clsx(
          'flex h-full w-full flex-col items-start justify-center p-8 text-left md:p-10',
          colors.paper,
        )}
      >
        <img
          src={theme === 'dark' ? brand.logo : brand.logoOnLight}
          alt={brand.name}
          className="mb-8 h-12 w-auto max-w-[220px] object-contain md:h-14"
        />
        <h2 className="max-w-md font-serif text-3xl font-bold leading-tight text-stone-800 dark:text-white md:text-4xl">
          {title}
        </h2>
        <div className="mt-6 h-px w-16" style={{ background: brandColors.gold }} />
        <p className="mt-6 text-sm text-stone-400">Turn the page to begin reading</p>
      </div>
    );
  }

  return (
    <div
      className={clsx('flex h-full w-full flex-col items-center justify-center p-8 text-center', colors.paper)}
    >
      <img
        src={theme === 'dark' ? brand.logo : brand.logoOnLight}
        alt={brand.name}
        className="mb-6 h-10 w-auto max-w-[200px] object-contain opacity-90 md:h-12"
      />
      {bookTitle && (
        <h2 className="max-w-sm font-serif text-2xl font-bold text-stone-800 dark:text-white">{bookTitle}</h2>
      )}
      <p className="mt-4 max-w-xs text-sm text-stone-500 dark:text-zinc-400">
        You have completed this session. Great work!
      </p>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEndSession?.();
        }}
        className="mt-8 rounded-xl px-8 py-3 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90"
        style={{ background: brandColors.gold, color: brandColors.textOnGold }}
      >
        End Session
      </button>
    </div>
  );
}
