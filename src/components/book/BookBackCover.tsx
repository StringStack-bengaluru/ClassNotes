import { brand, brandColors } from '../../config/theme';

/** Closed book back face — shared by cover flip and End Session close. */
export function BookBackCover() {
  return (
    <div
      className="flex h-full flex-col items-center justify-between p-8 md:p-10"
      style={{ background: brandColors.card }}
    >
      <div className="w-full text-center">
        <img
          src={brand.logo}
          alt={brand.name}
          className="mx-auto h-12 w-auto max-w-[240px] object-contain md:h-14"
        />
        <p
          className="mt-5 text-xs font-semibold uppercase tracking-[0.35em]"
          style={{ color: brandColors.gold }}
        >
          Digital Learning
        </p>
        <div className="mx-auto mt-4 h-px w-16" style={{ background: brandColors.gold }} />
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">{brand.tagline}</p>
      </div>

      <p className="text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} StringStack.ai
      </p>
    </div>
  );
}
