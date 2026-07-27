import clsx from 'clsx';
import { brand, brandColors, themeConfig } from '../../config/theme';
import type { ThemeMode } from '../../types/book';

interface QaCompletePageProps {
  theme: ThemeMode;
  bookTitle?: string;
}

/** Left page before End Session when Q&A finishes on the previous spread's right side. */
export function QaCompletePage({ theme, bookTitle }: QaCompletePageProps) {
  const colors = themeConfig[theme];

  return (
    <div
      className={clsx(
        'flex h-full w-full flex-col items-center justify-center p-8 text-center',
        colors.paper,
        colors.text,
      )}
    >
      <img
        src={theme === 'dark' ? brand.logo : brand.logoOnLight}
        alt={brand.name}
        className="mb-6 h-10 w-auto max-w-[200px] object-contain opacity-90 md:h-12"
      />
      {bookTitle && (
        <p
          className="mb-4 text-[11px] font-medium tracking-wide md:text-xs"
          style={{ color: brandColors.gold }}
        >
          {bookTitle}
        </p>
      )}
      <h2 className="max-w-sm font-serif text-2xl font-bold leading-snug text-stone-800 dark:text-white md:text-3xl">
        Your notes Q&amp;A completed
      </h2>
      <div className="mt-6 h-px w-16" style={{ background: brandColors.gold }} />
      <p className="mt-6 text-sm text-stone-500 dark:text-zinc-400">Turn the page to end your session</p>
    </div>
  );
}
