import { X } from 'lucide-react';
import { brandColors } from '../../config/theme';

interface NewChaptersBannerProps {
  count: number;
  onDismiss: () => void;
}

export function NewChaptersBanner({ count, onDismiss }: NewChaptersBannerProps) {
  if (count <= 0) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl"
      style={{
        background: brandColors.card,
        borderColor: brandColors.gold,
      }}
    >
      <p className="flex-1 text-sm text-white">
        <span className="font-semibold" style={{ color: brandColors.gold }}>
          {count} new chapter{count > 1 ? 's' : ''}
        </span>{' '}
        added to your book — reading continues linearly from where you left off.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
