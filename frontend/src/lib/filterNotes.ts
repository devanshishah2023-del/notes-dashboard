import type { Note } from '../types';

/** Case-insensitive match on title or content. Pure, so it's trivial to test. */
export function filterNotes(notes: Note[], query: string): Note[] {
  const q = query.trim().toLowerCase();
  if (!q) return notes;
  return notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
}
