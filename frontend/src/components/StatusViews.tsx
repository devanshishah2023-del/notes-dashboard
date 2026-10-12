import type { ReactNode } from 'react';
import styles from './StatusViews.module.css';

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading notes">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeleton} />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.panel} role="alert">
      <h2 className={styles.heading}>Couldn't load notes</h2>
      <p className={styles.text}>{message}</p>
      <button className="btn btn-primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>{title}</h2>
      <p className={styles.text}>{text}</p>
      {action}
    </div>
  );
}
