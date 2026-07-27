import { useCallback, useEffect, useState } from 'react';
import type { ThemeMode } from '../types/book';

const STORAGE_KEY = 'stringstack-reader:theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'sepia') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      switch (current) {
        case 'light':
          return 'sepia';
        case 'sepia':
          return 'dark';
        case 'dark':
          return 'light';
        default: {
          const _exhaustive: never = current;
          return _exhaustive;
        }
      }
    });
  }, []);

  return { theme, setTheme, cycleTheme };
}
