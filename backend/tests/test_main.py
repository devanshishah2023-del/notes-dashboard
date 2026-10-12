import pytest
from fastapi.testclient import TestClient

from backend.main import app, store

client = TestClient(app)


@pytest.fixture(autouse=True)
def empty_store():
    store.reset()
    yield
    store.reset()


def create(title="Title", content="Body"):
    res = client.post("/notes", json={"title": title, "content": content})
    assert res.status_code == 201
    return res.json()


def test_create_assigns_incrementing_ids():
    assert create()["id"] == 1
    assert create()["id"] == 2


def test_list_returns_newest_first():
    create("first")
    create("second")
    titles = [n["title"] for n in client.get("/notes").json()]
    assert titles == ["second", "first"]


def test_update_replaces_note():
    note = create()
    res = client.put(f"/notes/{note['id']}", json={"title": "New", "content": "Changed"})
    assert res.status_code == 200
    assert res.json() == {"id": note["id"], "title": "New", "content": "Changed"}


def test_update_missing_note_is_404():
    res = client.put("/notes/999", json={"title": "x", "content": ""})
    assert res.status_code == 404
    assert res.json()["detail"] == "Note 999 not found"


def test_delete_then_404():
    note = create()
    assert client.delete(f"/notes/{note['id']}").status_code == 204
    assert client.get("/notes").json() == []
    assert client.delete(f"/notes/{note['id']}").status_code == 404


@pytest.mark.parametrize("payload", [{"title": "", "content": "x"}, {"title": "   "}, {"content": "no title"}])
def test_invalid_payloads_are_rejected(payload):
    assert client.post("/notes", json=payload).status_code == 422


def test_title_is_trimmed():
    assert create("  padded  ")["title"] == "padded"
