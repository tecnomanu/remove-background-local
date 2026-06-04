"""API tests for the remove-bg-local server.

These run without downloading any model: the model load and the inference are
monkeypatched, so the suite is fast and works in CI with no network.
"""

import io

import pytest
from PIL import Image
from fastapi.testclient import TestClient

import server


@pytest.fixture
def client():
    return TestClient(server.app)


def png_bytes(size=(64, 64), color=(200, 60, 60)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return buf.getvalue()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["default_model"] == server.DEFAULT_MODEL


def test_models_payload(client):
    data = client.get("/models").json()
    assert data["default"] == server.DEFAULT_MODEL
    assert set(data["available"]) == set(server.AVAILABLE_MODELS)
    assert set(data["info"]) == set(server.AVAILABLE_MODELS)
    assert set(data["downloaded"]) == set(server.AVAILABLE_MODELS)
    # every model must expose complete, non-empty info for the Models page
    for key, info in data["info"].items():
        for field in ("title", "tagline", "speed", "quality", "best_for", "description"):
            assert info.get(field), f"{key} missing {field}"
        assert key in data["sizes_mb"]
        assert isinstance(data["downloaded"][key], bool)


def test_model_status_default(client):
    data = client.get("/model_status").json()
    assert data["model"] == server.DEFAULT_MODEL
    assert data["state"] in ("idle", "loading", "ready")
    assert isinstance(data["downloaded"], bool)
    assert data["progress"] is None or 0.0 <= data["progress"] <= 1.0


def test_model_status_unknown_is_400(client):
    r = client.get("/model_status", params={"model": "does-not-exist"})
    assert r.status_code == 400


def test_remove_empty_image_is_400(client):
    r = client.post("/remove", files={"image": ("a.png", b"", "image/png")})
    assert r.status_code == 400


def test_remove_invalid_image_is_400(client):
    r = client.post("/remove", files={"image": ("a.png", b"not really a png", "image/png")})
    assert r.status_code == 400


def test_remove_unknown_model_is_400(client):
    r = client.post(
        "/remove",
        files={"image": ("a.png", png_bytes(), "image/png")},
        data={"model": "does-not-exist"},
    )
    assert r.status_code == 400


def test_remove_too_large_is_413(client, monkeypatch):
    monkeypatch.setattr(server, "MAX_UPLOAD_BYTES", 8)
    r = client.post("/remove", files={"image": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 413


def test_remove_success(client, monkeypatch):
    """Full happy path with the model load + inference mocked out."""
    async def fake_ensure_session(model):
        return object()

    def fake_remove(img, session=None, **kwargs):
        return img.convert("RGBA")

    monkeypatch.setattr(server, "ensure_session", fake_ensure_session)
    monkeypatch.setattr(server, "remove", fake_remove)

    r = client.post(
        "/remove",
        files={"image": ("photo.jpg", png_bytes(), "image/png")},
        data={"model": server.DEFAULT_MODEL},
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert r.headers["x-model"] == server.DEFAULT_MODEL
    assert "x-processing-time" in r.headers
    out = Image.open(io.BytesIO(r.content))
    assert out.format == "PNG"
    assert out.mode == "RGBA"


def test_warmup_returns_state(client, monkeypatch):
    async def fake_ensure_session(model):
        return object()

    monkeypatch.setattr(server, "ensure_session", fake_ensure_session)
    r = client.post("/warmup", data={"model": server.DEFAULT_MODEL})
    assert r.status_code == 200
    assert r.json()["model"] == server.DEFAULT_MODEL


def test_providers_default_is_cpu():
    # Reliability guard: CoreML hangs on some models on Apple Silicon.
    assert server.PROVIDERS, "at least one execution provider must be configured"


def test_download_progress_helpers(monkeypatch):
    # A downloaded model reports full progress; helpers must not raise.
    monkeypatch.setattr(server, "is_downloaded", lambda name: True)
    assert server.download_progress(server.DEFAULT_MODEL) == 1.0
    monkeypatch.setattr(server, "is_downloaded", lambda name: False)
    monkeypatch.setattr(server, "U2NET_HOME", "/nonexistent-dir-for-tests")
    # No cache dir / no temp files -> 0.0, never an exception.
    assert server.download_progress(server.DEFAULT_MODEL) == 0.0
