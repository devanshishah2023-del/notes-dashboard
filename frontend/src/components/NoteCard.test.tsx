import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteCard } from './NoteCard';

const note = { id: 1, title: 'Groceries', content: 'Milk, eggs' };

function setup(overrides = {}) {
  const props = { note, onEdit: vi.fn(), onDelete: vi.fn(), ...overrides };
  render(<NoteCard {...props} />);
  return props;
}

describe('NoteCard', () => {
  it('shows the title and content', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Groceries' })).toBeInTheDocument();
    expect(screen.getByText('Milk, eggs')).toBeInTheDocument();
  });

  it('calls onEdit with the note', async () => {
    const { onEdit } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Edit "Groceries"' }));
    expect(onEdit).toHaveBeenCalledWith(note);
  });

  it('asks for confirmation before deleting', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete "Groceries"' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete this note?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('can cancel a delete', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete "Groceries"' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit "Groceries"' })).toBeInTheDocument();
  });

  it('hides actions while an optimistic note is still saving', () => {
    setup({ note: { ...note, id: -123 } });
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
