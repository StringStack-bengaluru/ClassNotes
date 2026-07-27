import { BookOpen } from 'lucide-react';
import { brand, brandColors } from '../config/theme';
import { Button } from './ui/Button';

interface EmptyBookViewProps {
  onBackToCover: () => void;
}

export function EmptyBookView({ onBackToCover }: EmptyBookViewProps) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-6 text-center"
      style={{
        background: `linear-gradient(135deg, ${brandColors.bgGradientFrom} 0%, ${brandColors.bg} 100%)`,
      }}
    >
      <BookOpen size={48} style={{ color: brandColors.gold }} className="mb-6 opacity-80" />
      <h1 className="text-2xl font-bold text-white">Study material coming soon</h1>
      <p className="mt-3 max-w-md text-zinc-400">
        Your digital book is being prepared. New chapters will appear here automatically.
      </p>
      <Button
        className="mt-8 font-semibold"
        style={{ background: brandColors.gold, color: brandColors.textOnGold }}
        onClick={onBackToCover}
      >
        Back to Cover
      </Button>
      <p className="mt-8 text-xs text-zinc-600">{brand.name}</p>
    </div>
  );
}
