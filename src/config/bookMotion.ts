/**
 * Book open/close motion feature flags.
 *
 * Stakeholder rollback (instant):
 *   USE_SYMMETRIC_CLOSE = false  → open animation only; close is a simple fade
 *   USE_MOTION_POLISH   = false  → hide vignette / desk shadow / spine light
 *
 * End Session: rewind pages to start → fade out → front cover (never back cover).
 */
export const bookMotionFlags = {
  /** Close slide mirrors open when using fold-style exits (cover open still uses slide). */
  USE_SYMMETRIC_CLOSE: true,
  /** Desk shadow, stage vignette, spine highlight. */
  USE_MOTION_POLISH: true,
} as const;

/** Single page aspect (height / width) — same for closed cover and open flip page. */
export const BOOK_PAGE_ASPECT = 1.35;

export function getBookSlideDistance(): number {
  if (typeof window === 'undefined') return 140;
  return window.innerWidth < 768 ? 72 : 140;
}

/** One page size matching FlipBookReader open pages. */
export function getBookPageSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 400, height: Math.round(400 * BOOK_PAGE_ASPECT) };
  }

  const maxWidth = Math.min(window.innerWidth - 48, 640);
  const maxHeight = window.innerHeight - 48;
  let width = Math.max(280, maxWidth);
  let height = Math.round(width * BOOK_PAGE_ASPECT);

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height / BOOK_PAGE_ASPECT);
  }

  return { width, height };
}

/** Shared easing: soft settle (Apple Books-like). */
export const bookEase = [0.22, 1, 0.36, 1] as const;
export const bookEaseInOut = [0.4, 0, 0.2, 1] as const;

/** Cover fold + inner reveal — one continuous motion. */
export const BOOK_OPEN_DURATION = 2.2;
