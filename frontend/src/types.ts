export interface Note {
  id: number;
  title: string;
  content: string;
}

/** What the client sends: the server owns ids. */
export type NoteInput = Omit<Note, 'id'>;
