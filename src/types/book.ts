export type PageKind = 'session-start' | 'content' | 'qa-complete' | 'session-end';
export type ChapterContentMode = 'pdf' | 'qa';

export interface QAItem {
  question: string;
  answer: string;
}

export interface ChapterContentFile {
  title?: string;
  itemsPerPage?: number;
  source?: string;
  items: QAItem[];
}

export interface BookChapter {
  id: string;
  title: string;
  order: number;
  pdfUrl: string;
  contentUrl?: string;
  contentMode?: ChapterContentMode;
  pageCount?: number;
  qaItems?: QAItem[];
  itemsPerPage?: number;
  uploadedAt: string;
  filename?: string;
}

export interface BookManifest {
  id: string;
  slug?: string;
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  coverColor: string;
  accentColor: string;
  chapters: BookChapter[];
  totalPages?: number;
  version: string;
  updatedAt: string;
}

export interface FlatPage {
  kind: PageKind;
  globalIndex: number;
  chapterId: string;
  chapterTitle: string;
  chapterOrder: number;
  pageInChapter: number;
  pdfUrl: string;
  sessionLabel?: string;
  contentMode?: ChapterContentMode;
  qaItems?: QAItem[];
  contentPageTotal?: number;
}

export interface ReadingProgress {
  bookId: string;
  globalPageIndex: number;
  chapterId: string;
  updatedAt: string;
  percentComplete: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  globalPageIndex: number;
  chapterTitle: string;
  label: string;
  createdAt: string;
}

export interface ReadingNote {
  id: string;
  bookId: string;
  globalPageIndex: number;
  content: string;
  createdAt: string;
}

export interface RecentlyReadEntry {
  bookId: string;
  title: string;
  globalPageIndex: number;
  visitedAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'sepia';

export interface ReaderSettings {
  theme: ThemeMode;
  zoom: number;
  fullscreen: boolean;
}
