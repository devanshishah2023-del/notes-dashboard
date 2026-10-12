# Notes Dashboard

A small notes app: **React 19 + TypeScript + React Query** on the front, **FastAPI** on the back.
Add, edit (modal), delete (with confirm), and search notes. Every change goes through the API and
is applied **optimistically**, with automatic rollback if the server rejects it.

notes-dashboard/
│
├── backend/                         FastAPI service (in-memory store) + pytest suite
│   ├── main.py
│   ├── requirements.txt
│   └── tests/
│       └── test_main.py
│
└── frontend/                        Vite + React app
    └── src/
        ├── api/                     fetch wrapper (ApiError) + typed notes endpoints
        ├── hooks/
        │   └── useNotes.ts          React Query query + optimistic mutations
        ├── context/
        │   └── ToastContext.tsx     app-wide notifications
        ├── components/              NoteCard, NoteFormModal, loading/error/empty views
        ├── lib/
        │   └── filterNotes.ts       pure search function
        └── App.tsx                  the dashboard page

## How to run

Requires **Python 3.10+** and **Node 20.19+**.

```bash
# 1. Backend  (from the repo root)
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload                      # http://localhost:8000  (docs at /docs)

# 2. Frontend (second terminal)
cd frontend
npm install
npm run dev                                            # http://localhost:5173

The Vite dev server proxies /api/* → http://localhost:8000, so there is no CORS setup to do.
(To point at a different backend, set VITE_API_URL, e.g. VITE_API_URL=http://localhost:8000 npm run dev;
the backend allows the Vite origin via CORS.)

Seeing loading states and optimistic updates: the local API is too fast to notice them. Start it with
artificial latency: NOTES_LATENCY_MS=1200 uvicorn backend.main:app --reload. New notes now appear
instantly in a faded "Saving…" state, then become real cards when the server answers.
To start with an empty board, set NOTES_SEED=0.

Tests

cd frontend && npm test               # 18 tests — Vitest + React Testing Library
cd .. && pip install -r backend/requirements-dev.txt && pytest backend   # 9 tests

Decisions and libraries

Concern: Server state
Choice: TanStack React Query
Why: Notes live on the server, so the client holds a cache, not the source of truth. React Query gives
caching, loading/error flags, retries, refetch-after-mutation and the hooks needed for optimistic
updates — all of which would be hand-written reducers in Context or Redux.
────────────────────────────────────────
Concern: Global UI state
Choice: React Context (ToastContext)
Why: Notifications are needed from anywhere, including inside mutation hooks. That's a small,
rarely-changing, cross-cutting concern — what Context is for. The value is memoised so consumers
don't re-render on every toast.
────────────────────────────────────────
Concern: Local state
Choice: useState
Why: Search text, which modal is open, and form fields belong to one component. Hoisting them into
global state would add coupling for no benefit.
────────────────────────────────────────
Concern: Styling
Choice: CSS Modules + a few global primitives
Why: Scoped class names per component, zero runtime, no build-time setup. Design tokens are CSS
variables, which also gives dark mode for free via prefers-color-scheme.
────────────────────────────────────────
Concern: Language
Choice: TypeScript (strict)
Why: The Note / NoteInput types are shared by the API layer, hooks and components, so a shape change
fails at compile time.
────────────────────────────────────────
Concern: Edit UX
Choice: Modal, one component for add and edit
Why: Consistent focus handling (autofocus, Escape, click-outside), and the grid layout doesn't jump
while editing. The modal is mounted only while open and keyed by note id, so form state always
starts fresh.
────────────────────────────────────────
Concern: Delete UX
Choice: Inline confirm on the card
Why: Prevents accidental deletes without the friction of a second modal.

Backend changes to the starter template

The starter works, but a couple of its behaviours make a reliable client harder to write, so I changed them:

- Server-assigned ids. The starter trusts the client to send a unique id; two tabs could collide. Clients now send {title, content} and receive the created note with its id.
- Real HTTP errors. Updating a missing note returned 200 {"error": ...}, and deleting one returned success. Both now return 404, so the frontend can rely on status codes alone.
- Validation. Title is required, trimmed, and length-limited; bad input returns 422 with a message the UI surfaces.
- REST status codes: 201 on create, 204 on delete. CORS enabled, a lock around the store (sync endpoints run in a thread pool), and newest-first ordering to match the UI.
- Storage sits behind a small NoteStore class, so swapping in a database wouldn't touch the routes.

Error handling and loading states

- All requests go through api/client.ts, which converts network failures and non-2xx responses (including FastAPI validation lists) into a single ApiError with a readable message.
- Initial load: skeleton cards → error panel with Try again → empty state, or the grid. A small "· syncing" marker shows background refetches.
- Mutations: failures roll back the optimistic change and show a toast (e.g. "Couldn't delete note: Server exploded").

Stretch features

- Search — filters by title and content, case-insensitive. Uses useDeferredValue so typing stays responsive on large lists, and the filter is a pure function (lib/filterNotes.ts) with its own tests.
- Optimistic UI — create, update and delete. Each mutation snapshots the cache in onMutate, writes the expected result, restores the snapshot in onError, and refetches in onSettled so the cache always converges to the server. New notes get a temporary negative id and render as "Saving…" (actions disabled) until the real id arrives.
- Tests — 18 frontend tests: NoteCard and NoteFormModal unit tests, filterNotes tests, and an integration suite that renders the whole app against a fake backend (stubbed fetch), covering load, error + retry, add, edit, search, and rollback of a failed optimistic delete. Plus 9 backend tests with pytest. (Vitest was used instead of Jest because it shares Vite's config; the API is Jest-compatible — describe/it/expect/vi.fn.)
- Performance touches — memo(NoteCard) with stable useCallback handlers so search typing doesn't re-render every card; memoised filtering; React Query de-duplicates and caches requests.
- Accessibility — labelled inputs, role="dialog"/aria-modal, validation errors linked via aria-describedby, toasts in an aria-live region, descriptive button labels (Edit "Groceries"), visible focus rings.
- Responsive + dark mode.

Adapting to React Native

Most of the app is already platform-independent, which is the point of the layering:

- Reused as-is: types.ts, api/, hooks/useNotes.ts (React Query works identically in React Native), lib/filterNotes.ts, and the ToastContext logic. That's all the data, state, and optimistic-update behaviour.
- Rewritten: only the view layer. div/article → View, text → Text, input/textarea → TextInput (with multiline), buttons → Pressable. The CSS grid becomes a FlatList (numColumns={2} on tablets, 1 on phones) for virtualised scrolling; CSS Modules become StyleSheet.create, with dark mode via useColorScheme().
- Mobile-native UX: the edit modal becomes RN Modal (or a bottom sheet) with KeyboardAvoidingView; delete becomes swipe-to-delete with an undo toast instead of an inline confirm; pull-to-refresh calls refetch().
- Mobile concerns: the base URL comes from config (no Vite proxy; localhost means the device itself). For offline use, React Query's onlineManager can hook into @react-native-community/netinfo, and the cache can be persisted to AsyncStorage so notes show instantly on launch and paused mutations resume when the connection returns.
- In a real project I'd move the shared code into a package in a monorepo (packages/core, apps/web, apps/mobile) so both apps import one implementation.

What I'd do next with more time

Persistent storage (SQLite via SQLModel), pagination or server-side search for large note sets, a focus trap in the modal, and end-to-end tests with Playwright in CI.
```
