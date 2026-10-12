"""Notes API — a small in-memory CRUD service for the Notes Dashboard.

Built from the starter template in the assessment, with a few fixes that a
real client depends on:

* The server assigns ids (the starter trusted the client to send a unique id).
* Missing notes return a real 404 instead of a 200 with an error body, so the
  frontend can treat failures uniformly through HTTP status codes.
* Input is validated (non-empty title, length limits) -> 422 on bad input.
* CORS is enabled for the Vite dev server.
* A lock guards the store, since FastAPI runs sync endpoints in a thread pool.
* Optional artificial latency (NOTES_LATENCY_MS) makes loading states and
  optimistic updates visible during a demo.
"""

from __future__ import annotations

import asyncio
import os
from threading import Lock

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator


class NoteIn(BaseModel):
    """Payload for creating or replacing a note (no id: the server owns ids)."""

    title: str = Field(min_length=1, max_length=200)
    content: str = Field(default="", max_length=10_000)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title must not be blank")
        return value


class Note(NoteIn):
    id: int


class NoteStore:
    """Thread-safe in-memory store. Swap for a database without touching routes."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._notes: dict[int, Note] = {}
        self._next_id = 1

    def list(self) -> list[Note]:
        with self._lock:
            # Newest first, which matches where the UI inserts new notes.
            return sorted(self._notes.values(), key=lambda n: n.id, reverse=True)

    def create(self, data: NoteIn) -> Note:
        with self._lock:
            note = Note(id=self._next_id, **data.model_dump())
            self._notes[note.id] = note
            self._next_id += 1
            return note

    def update(self, note_id: int, data: NoteIn) -> Note | None:
        with self._lock:
            if note_id not in self._notes:
                return None
            note = Note(id=note_id, **data.model_dump())
            self._notes[note_id] = note
            return note

    def delete(self, note_id: int) -> bool:
        with self._lock:
            return self._notes.pop(note_id, None) is not None

    def reset(self) -> None:
        with self._lock:
            self._notes.clear()
            self._next_id = 1


store = NoteStore()

app = FastAPI(title="Notes API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

LATENCY_SECONDS = int(os.getenv("NOTES_LATENCY_MS", "0")) / 1000


@app.middleware("http")
async def simulated_latency(request, call_next):
    if LATENCY_SECONDS:
        await asyncio.sleep(LATENCY_SECONDS)
    return await call_next(request)


def _not_found(note_id: int) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Note {note_id} not found")


@app.get("/notes", response_model=list[Note])
def get_notes() -> list[Note]:
    return store.list()


@app.post("/notes", response_model=Note, status_code=status.HTTP_201_CREATED)
def add_note(data: NoteIn) -> Note:
    return store.create(data)


@app.put("/notes/{note_id}", response_model=Note)
def update_note(note_id: int, data: NoteIn) -> Note:
    note = store.update(note_id, data)
    if note is None:
        raise _not_found(note_id)
    return note


@app.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int) -> Response:
    if not store.delete(note_id):
        raise _not_found(note_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _seed() -> None:
    if os.getenv("NOTES_SEED", "1") != "1":
        return
    for title, content in [
        ("Welcome 👋", "This is your notes dashboard. Click Edit to change a note, or add a new one."),
        ("Groceries", "Oat milk, coffee beans, spinach, lemons"),
        ("Ideas", "Search runs on the client and filters by title and content."),
    ]:
        store.create(NoteIn(title=title, content=content))


_seed()
