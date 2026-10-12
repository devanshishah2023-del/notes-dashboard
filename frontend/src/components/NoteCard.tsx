import { memo, useState } from 'react';
import { isPendingNote } from '../hooks/useNotes';
import type { Note } from '../types';
import styles from './NoteCard.module.css';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
}

/** memo: with stable callbacks from the parent, typing in search won't re-render every card. */
export const NoteCard = memo(function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const [confirming, setConfirming] = useState(false);
  const pending = isPendingNote(note);

  return (
    <article className={`${styles.card} ${pending ? styles.pending : ''}`} aria-busy={pending}>
      <h3 className={styles.title}>{note.title}</h3>
      {note.content ? (
        <p className={styles.content}>{note.content}</p>
      ) : (
        <p className={`${styles.content} ${styles.empty}`}>No content</p>
      )}

      <footer className={styles.actions}>
        {pending ? (
          <span className={styles.saving}>Saving…</span>
        ) : confirming ? (
          <>
            <span className={styles.confirmText}>Delete this note?</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(note.id)}>
              Delete
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(note)} aria-label={`Edit "${note.title}"`}>
              Edit
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirming(true)}
              aria-label={`Delete "${note.title}"`}
            >
              Delete
            </button>
          </>
        )}
      </footer>
    </article>
  );
});
