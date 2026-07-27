/** StringStack.ai brand palette — matches admin login portal */
export const brandColors = {
  bg: '#0d0d0d',
  bgGradientFrom: '#0d0d0d',
  bgGradientTo: '#1a1a1a',
  card: '#252525',
  cardBorder: '#333333',
  gold: '#C6A43B',
  goldLight: '#D4AF37',
  goldMuted: '#a8893a',
  text: '#ffffff',
  textMuted: '#9ca3af',
  textOnGold: '#1a1a1a',
} as const;

export const themeConfig = {
  light: {
    bg: 'bg-stone-100',
    readerBg: 'bg-gradient-to-br from-stone-200 via-stone-100 to-amber-50',
    paper: 'bg-[#faf8f5]',
    paperBorder: 'border-stone-200/80',
    text: 'text-stone-800',
    muted: 'text-stone-500',
    sidebar: 'bg-white/90 border-stone-200',
    toolbar: 'bg-white/80 border-stone-200',
    accent: 'text-[#C6A43B]',
    accentBg: 'bg-[#C6A43B]',
    shadow: 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]',
  },
  dark: {
    bg: 'bg-[#0d0d0d]',
    readerBg: 'bg-gradient-to-br from-[#0d0d0d] via-[#1a1a1a] to-[#0d0d0d]',
    paper: 'bg-[#1c1c1e]',
    paperBorder: 'border-zinc-700/60',
    text: 'text-zinc-100',
    muted: 'text-zinc-400',
    sidebar: 'bg-[#252525]/95 border-[#333333]',
    toolbar: 'bg-[#252525]/90 border-[#333333]',
    accent: 'text-[#D4AF37]',
    accentBg: 'bg-[#C6A43B]',
    shadow: 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]',
  },
  sepia: {
    bg: 'bg-[#ebe4d5]',
    readerBg: 'bg-gradient-to-br from-[#ddd5c3] via-[#ebe4d5] to-[#f5efe3]',
    paper: 'bg-[#f4ecd8]',
    paperBorder: 'border-[#d4c9b0]',
    text: 'text-stone-800',
    muted: 'text-stone-600',
    sidebar: 'bg-[#faf6ed]/95 border-[#d4c9b0]',
    toolbar: 'bg-[#faf6ed]/90 border-[#d4c9b0]',
    accent: 'text-[#a8893a]',
    accentBg: 'bg-[#C6A43B]',
    shadow: 'shadow-[0_20px_60px_-15px_rgba(80,60,30,0.3)]',
  },
} as const;

const viteBase = import.meta.env.BASE_URL || '/';

function brandAsset(path: string): string {
  return `${viteBase}${path.replace(/^\//, '')}`;
}

export const brand = {
  name: 'StringStack.ai',
  tagline: 'Digital Learning Platform',
  subtitle: 'Secure · Structured · Smart Learning',
  contactPhone: '8050749191',
  contactAddress:
    '5th floor, No.1, Pine Hurst, StringStack Office, 100 Feet Ring Rd, Vysya Bank Colony, BTM Layout 2nd Stage, BTM Layout, Bengaluru, Karnataka 560076',
  /** Full wordmark for dark backgrounds (white text + gold emblem). */
  logo: brandAsset('/stringstack-logo.png'),
  /** Full wordmark for light paper / light themes. */
  logoOnLight: brandAsset('/stringstack-logo-on-light.png'),
  logoIcon: brandAsset('/favicon-icon.png'),
};
