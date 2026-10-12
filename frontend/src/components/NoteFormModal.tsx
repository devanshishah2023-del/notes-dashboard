import { useEffect, useState, type FormEvent } from 'react';
import type { Note, NoteInput } from '../types';
import styles from './NoteFormModal.module.css';

interface NoteFormModalProps {
  /** Pass a note to edit it; omit to create a new one. */
  note?: Note;
  onClose: () => void;
  onSubmit: (input: NoteInput) => void;
}

/** One form for both add and edit. The parent mounts it only while open, so state starts fresh each time. */
export function NoteFormModal({ note, onClose, onSubmit }: NoteFormModalProps) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [error, setError] = useState<string | null>(null);
  const isEdit = note !== undefined;

  // Close on Escape; the listener is removed when the modal unmounts.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }
    onSubmit({ title: trimmedTitle, content: content.trim() });
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(); // click outside the dialog
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="note-modal-heading">
        <h2 id="note-modal-heading" className={styles.heading}>
          {isEdit ? 'Edit note' : 'New note'}
        </h2>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <label htmlFor="note-title" className={styles.label}>
            Title
          </label>
          <input
            id="note-title"
            className="input"
            autoFocus
            maxLength={200}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? 'note-title-error' : undefined}
          />
          {error && (
            <p id="note-title-error" className={styles.error} role="alert">
              {error}
            </p>
          )}

          <label htmlFor="note-content" className={styles.label}>
            Content
          </label>
          <textarea
            id="note-content"
            className="input"
            rows={7}
            maxLength={10_000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className={styles.actions}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Save changes' : 'Add note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
