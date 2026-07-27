import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { brandColors } from '../../config/theme';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        {
          'shadow-lg': variant === 'primary',
          'bg-white/80 text-stone-700 border border-stone-200 hover:bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700':
            variant === 'secondary',
          'bg-transparent text-stone-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800':
            variant === 'ghost',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className,
      )}
      style={
        variant === 'primary' && !className?.includes('bg-')
          ? { background: brandColors.gold, color: brandColors.textOnGold }
          : undefined
      }
      {...props}
    >
      {children}
    </button>
  );
}
