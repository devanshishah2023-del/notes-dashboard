import type { Note, NoteInput } from '../types';
import { request } from './client';

export const notesApi = {
  list: () => request<Note[]>('/notes'),

  create: (input: NoteInput) =>
    request<Note>('/notes', { method: 'POST', body: JSON.stringify(input) }),

  update: ({ id, ...input }: Note) =>
    request<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  remove: (id: number) => request<void>(`/notes/${id}`, { method: 'DELETE' }),
};
