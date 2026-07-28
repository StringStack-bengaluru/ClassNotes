export type PageKind = 'session-start' | 'content' | 'qa-complete' | 'session-end';
/** `qa` = current Q&A flip book. `document` = formatted DOCX blocks. `pdf` = PDF canvas. */
export type ChapterContentMode = 'pdf' | 'qa' | 'document';

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

/** Inline run from DOCX (parallel document mode). */
export interface DocumentTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export type DocumentBlock =
  | { type: 'blank' }
  | { type: 'paragraph'; runs: DocumentTextRun[]; align?: string; indent?: boolean }
  | { type: 'heading'; level: number; runs: DocumentTextRun[]; align?: string }
  | { type: 'quote'; runs: DocumentTextRun[]; align?: string }
  | { type: 'list'; ordered?: boolean; items: { runs: DocumentTextRun[] }[] }
  | { type: 'code'; text: string }
  | { type: 'table'; rows: string[][] }
  | { type: 'image'; src: string; alt?: string };

export interface DocumentContentFile {
  title?: string;
  mode?: 'document';
  source?: string;
  pageCount?: number;
  blocks: DocumentBlock[];
  /** Pre-paginated block groups for flip pages. */
  pages?: DocumentBlock[][];
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
  /** Formatted document blocks for the active flip page (after enrich + flatten). */
  documentPages?: DocumentBlock[][];
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
  documentBlocks?: DocumentBlock[];
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
