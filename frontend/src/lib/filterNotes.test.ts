import { filterNotes } from './filterNotes';

const notes = [
  { id: 1, title: 'Groceries', content: 'Milk and EGGS' },
  { id: 2, title: 'Work', content: 'Review the PR' },
];

describe('filterNotes', () => {
  it('returns everything for an empty or blank query', () => {
    expect(filterNotes(notes, '')).toBe(notes);
    expect(filterNotes(notes, '   ')).toBe(notes);
  });

  it('matches title or content, case-insensitively', () => {
    expect(filterNotes(notes, 'grocer').map((n) => n.id)).toEqual([1]);
    expect(filterNotes(notes, 'eggs').map((n) => n.id)).toEqual([1]);
    expect(filterNotes(notes, 'pr').map((n) => n.id)).toEqual([2]);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterNotes(notes, 'zzz')).toEqual([]);
  });
});
