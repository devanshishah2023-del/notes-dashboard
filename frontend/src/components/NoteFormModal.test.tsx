import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteFormModal } from './NoteFormModal';

describe('NoteFormModal', () => {
  it('requires a title', async () => {
    const onSubmit = vi.fn();
    render(<NoteFormModal onClose={vi.fn()} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values', async () => {
    const onSubmit = vi.fn();
    render(<NoteFormModal onClose={vi.fn()} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Title'), '  Plan trip  ');
    await userEvent.type(screen.getByLabelText('Content'), 'Book flights ');
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Plan trip', content: 'Book flights' });
  });

  it('pre-fills fields when editing', () => {
    render(
      <NoteFormModal note={{ id: 4, title: 'Old', content: 'Body' }} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Edit note' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Old');
    expect(screen.getByLabelText('Content')).toHaveValue('Body');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<NoteFormModal onClose={onClose} onSubmit={vi.fn()} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
