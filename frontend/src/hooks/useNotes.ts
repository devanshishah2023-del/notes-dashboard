import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { notesApi } from '../api/notes';
import { useToast } from '../context/ToastContext';
import type { Note, NoteInput } from '../types';

export const notesKey = ['notes'] as const;

/** A note created optimistically has a negative id until the server assigns a real one. */
export const isPendingNote = (note: Note) => note.id < 0;

export function useNotesQuery() {
  return useQuery({ queryKey: notesKey, queryFn: notesApi.list });
}

/*
 * Optimistic update recipe (same for all three mutations):
 *   onMutate  -> cancel in-flight fetches, snapshot the cache, write the expected result
 *   onError   -> restore the snapshot and tell the user
 *   onSettled -> refetch so the cache ends up matching the server either way
 */

type Snapshot = { previous: Note[] | undefined };

async function snapshot(qc: QueryClient): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: notesKey });
  return { previous: qc.getQueryData<Note[]>(notesKey) };
}

function rollback(qc: QueryClient, ctx: Snapshot | undefined) {
  if (ctx) qc.setQueryData(notesKey, ctx.previous);
}

export function useCreateNote() {
  const qc = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (input: NoteInput) => notesApi.create(input),
    onMutate: async (input) => {
      const ctx = await snapshot(qc);
      const tempId = -Date.now();
      qc.setQueryData<Note[]>(notesKey, (old = []) => [{ id: tempId, ...input }, ...old]);
      return { ...ctx, tempId };
    },
    onSuccess: (saved, _input, ctx) => {
      // Swap the placeholder for the real note so the card keeps its position.
      qc.setQueryData<Note[]>(notesKey, (old = []) => old.map((n) => (n.id === ctx?.tempId ? saved : n)));
    },
    onError: (err, _input, ctx) => {
      rollback(qc, ctx);
      notify(`Couldn't add note: ${err.message}`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notesKey }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (note: Note) => notesApi.update(note),
    onMutate: async (note) => {
      const ctx = await snapshot(qc);
      qc.setQueryData<Note[]>(notesKey, (old = []) => old.map((n) => (n.id === note.id ? note : n)));
      return ctx;
    },
    onError: (err, _note, ctx) => {
      rollback(qc, ctx);
      notify(`Couldn't save changes: ${err.message}`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notesKey }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (id: number) => notesApi.remove(id),
    onMutate: async (id) => {
      const ctx = await snapshot(qc);
      qc.setQueryData<Note[]>(notesKey, (old = []) => old.filter((n) => n.id !== id));
      return ctx;
    },
    onError: (err, _id, ctx) => {
      rollback(qc, ctx);
      notify(`Couldn't delete note: ${err.message}`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notesKey }),
  });
}
