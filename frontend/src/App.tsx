import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { NoteCard } from './components/NoteCard';
import { NoteFormModal } from './components/NoteFormModal';
import { EmptyState, ErrorState, LoadingGrid } from './components/StatusViews';
import { useCreateNote, useDeleteNote, useNotesQuery, useUpdateNote } from './hooks/useNotes';
import { filterNotes } from './lib/filterNotes';
import type { Note, NoteInput } from './types';
import styles from './App.module.css';

type ModalState = { mode: 'create' } | { mode: 'edit'; note: Note } | null;

export default function App() {
  const { data: notes = [], isPending, isError, error, refetch, isFetching } = useNotesQuery();
  const { mutate: createNote } = useCreateNote();
  const { mutate: updateNote } = useUpdateNote();
  const { mutate: deleteNote } = useDeleteNote();

  const [query, setQuery] = useState('');
  // Keeps the input responsive: filtering runs at lower priority than typing.
  const deferredQuery = useDeferredValue(query);
  const visibleNotes = useMemo(() => filterNotes(notes, deferredQuery), [notes, deferredQuery]);

  const [modal, setModal] = useState<ModalState>(null);

  // Stable callbacks so the memoised NoteCard doesn't re-render needlessly.
  const closeModal = useCallback(() => setModal(null), []);
  const openEdit = useCallback((note: Note) => setModal({ mode: 'edit', note }), []);
  const handleDelete = useCallback((id: number) => deleteNote(id), [deleteNote]);

  const handleSubmit = (input: NoteInput) => {
    if (modal?.mode === 'edit') updateNote({ id: modal.note.id, ...input });
    else createNote(input);
    closeModal(); // optimistic: the UI already shows the change
  };

  function renderBody() {
    if (isPending) return <LoadingGrid />;
    if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
    if (notes.length === 0) {
      return (
        <EmptyState
          title="No notes yet"
          text="Capture your first idea — it only takes a second."
          action={
            <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>
              Add your first note
            </button>
          }
        />
      );
    }
    if (visibleNotes.length === 0) {
      return <EmptyState title="No matches" text={`Nothing matches "${deferredQuery.trim()}".`} />;
    }
    return (
      <div className="grid">
        {visibleNotes.map((note) => (
          <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={handleDelete} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Notes</h1>
          <p className={styles.subtitle}>
            {isPending ? 'Loading…' : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
            {isFetching && !isPending && <span className={styles.syncing}> · syncing</span>}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>
          + New note
        </button>
      </header>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={`input ${styles.search}`}
          placeholder="Search notes…"
          aria-label="Search notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <main>{renderBody()}</main>

      {modal && (
        <NoteFormModal
          // key resets form state when switching between notes
          key={modal.mode === 'edit' ? modal.note.id : 'new'}
          note={modal.mode === 'edit' ? modal.note : undefined}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
