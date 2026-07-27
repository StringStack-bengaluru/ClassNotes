import { BookOpen, Layers, MapPin, Phone } from 'lucide-react';
import { brand, brandColors } from '../../config/theme';
import type { BookManifest } from '../../types/book';
import { Button } from '../ui/Button';

interface CoverFaceProps {
  manifest: BookManifest;
  chapterCount: number;
  totalPages: number;
  hasContent: boolean;
  isOpening?: boolean;
  onStartLearning?: () => void;
}

/** Front cover artwork — used on the closed book and the opening leaf. */
export function CoverFace({
  manifest,
  chapterCount,
  totalPages,
  hasContent,
  isOpening = false,
  onStartLearning,
}: CoverFaceProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-r-md rounded-l-sm border border-zinc-700 shadow-2xl"
      style={{
        boxSizing: 'border-box',
        backfaceVisibility: 'hidden',
        borderLeft: `4px solid ${brandColors.gold}`,
        background: `linear-gradient(160deg, ${brandColors.card} 0%, ${brandColors.bgGradientTo} 100%)`,
      }}
    >
      <div className="book-spine-highlight pointer-events-none absolute inset-0" />
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

          {onStartLearning && (
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
                onStartLearning();
              }}
            >
              {isOpening ? 'Opening…' : 'Start Learning'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
