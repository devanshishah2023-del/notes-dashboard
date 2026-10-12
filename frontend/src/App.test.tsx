import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import type { Note } from './types';

/** A tiny in-memory fake of the FastAPI backend, wired in by stubbing fetch. */
function fakeBackend(initial: Note[], { failDeletes = false } = {}) {
  let notes = [...initial];
  let nextId = Math.max(0, ...notes.map((n) => n.id)) + 1;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const id = Number(url.split('/').pop());
    const body = init?.body ? JSON.parse(init.body as string) : undefined;

    if (method === 'GET') return json(notes);
    if (method === 'POST') {
      const note = { id: nextId++, ...body };
      notes = [note, ...notes];
      return json(note, 201);
    }
    if (method === 'PUT') {
      notes = notes.map((n) => (n.id === id ? { id, ...body } : n));
      return json({ id, ...body });
    }
    if (method === 'DELETE') {
      if (failDeletes) return json({ detail: 'Server exploded' }, 500);
      notes = notes.filter((n) => n.id !== id);
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unhandled ${method} ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const seed = [
  { id: 2, title: 'Work', content: 'Review the PR' },
  { id: 1, title: 'Groceries', content: 'Milk' },
];

afterEach(() => vi.unstubAllGlobals());

describe('Notes dashboard', () => {
  it('loads and shows notes from the API', async () => {
    fakeBackend(seed);
    renderApp();

    expect(screen.getByLabelText('Loading notes')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Work' })).toBeInTheDocument();
    expect(screen.getByText('2 notes')).toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    renderApp();

    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();

    fakeBackend(seed); // server is back
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Groceries' })).toBeInTheDocument();
  });

  it('adds a note through the API', async () => {
    const fetchMock = fakeBackend(seed);
    renderApp();
    await screen.findByRole('heading', { name: 'Work' });

    await userEvent.click(screen.getByRole('button', { name: '+ New note' }));
    await userEvent.type(screen.getByLabelText('Title'), 'Call mom');
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));

    expect(await screen.findByRole('heading', { name: 'Call mom' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/notes', expect.objectContaining({ method: 'POST' }));
    await waitFor(() => expect(screen.getByText('3 notes')).toBeInTheDocument());
  });

  it('edits a note through the API', async () => {
    fakeBackend(seed);
    renderApp();

    await userEvent.click(await screen.findByRole('button', { name: 'Edit "Work"' }));
    const title = screen.getByLabelText('Title');
    await userEvent.clear(title);
    await userEvent.type(title, 'Work (urgent)');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('heading', { name: 'Work (urgent)' })).toBeInTheDocument();
  });

  it('rolls back an optimistic delete when the server fails', async () => {
    fakeBackend(seed, { failDeletes: true });
    renderApp();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete "Work"' }));
    const card = screen.getByText('Delete this note?').closest('article')!;
    await userEvent.click(within(card).getByRole('button', { name: 'Delete' }));

    // The toast explains what happened and the note comes back.
    expect(await screen.findByText("Couldn't delete note: Server exploded")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Work' })).toBeInTheDocument();
  });

  it('filters notes with search', async () => {
    fakeBackend(seed);
    renderApp();
    await screen.findByRole('heading', { name: 'Work' });

    await userEvent.type(screen.getByLabelText('Search notes'), 'milk');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Work' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Groceries' })).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Search notes'));
    await userEvent.type(screen.getByLabelText('Search notes'), 'nope');
    expect(await screen.findByText('No matches')).toBeInTheDocument();
  });
});
