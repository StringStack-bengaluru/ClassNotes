import type { Bookmark, ReadingNote, ReadingProgress, RecentlyReadEntry } from '../types/book';

const PREFIX = 'stringstack-reader';

function storageKey(suffix: string, bookId: string): string {
  return `${PREFIX}:${suffix}:${bookId}`;
}

export function loadProgress(bookId: string): ReadingProgress | null {
  try {
    const raw = localStorage.getItem(storageKey('progress', bookId));
    return raw ? (JSON.parse(raw) as ReadingProgress) : null;
  } catch {
    return null;
  }
}

export function saveProgress(progress: ReadingProgress): void {
  localStorage.setItem(storageKey('progress', progress.bookId), JSON.stringify(progress));
}

export function loadBookmarks(bookId: string): Bookmark[] {
  try {
    const raw = localStorage.getItem(storageKey('bookmarks', bookId));
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(bookId: string, bookmarks: Bookmark[]): void {
  localStorage.setItem(storageKey('bookmarks', bookId), JSON.stringify(bookmarks));
}

export function loadNotes(bookId: string): ReadingNote[] {
  try {
    const raw = localStorage.getItem(storageKey('notes', bookId));
    return raw ? (JSON.parse(raw) as ReadingNote[]) : [];
  } catch {
    return [];
  }
}

export function saveNotes(bookId: string, notes: ReadingNote[]): void {
  localStorage.setItem(storageKey('notes', bookId), JSON.stringify(notes));
}

export function loadRecentlyRead(): RecentlyReadEntry[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}:recently-read`);
    return raw ? (JSON.parse(raw) as RecentlyReadEntry[]) : [];
  } catch {
    return [];
  }
}

export function addRecentlyRead(entry: RecentlyReadEntry): void {
  const existing = loadRecentlyRead().filter((item) => item.bookId !== entry.bookId);
  const updated = [entry, ...existing].slice(0, 10);
  localStorage.setItem(`${PREFIX}:recently-read`, JSON.stringify(updated));
}
