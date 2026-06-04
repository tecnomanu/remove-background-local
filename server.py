"""
remove-bg-local
Local server to remove image backgrounds using SOTA open-source models.

Available models (rembg):
- birefnet-general   : Best overall quality (default) - 2024
- birefnet-portrait  : Optimized for people / portraits
- isnet-general-use  : Faster, very good quality
- u2net              : Classic, good speed/quality balance
- u2net_human_seg    : People only, very fast

Endpoints:
- GET  /             -> UI (HTML)
- POST /remove       -> Receives an image, returns a PNG with a transparent background
- GET  /models       -> List of available models (with approx download sizes)
- GET  /model_status -> Load state of a model (idle / loading / ready / error)
- POST /warmup       -> Start loading a model in the background (non-blocking)
- GET  /health       -> Server status

Design notes:
- The first time a model is used it is downloaded (100-930 MB) and then cached
  in ~/.u2net/. Both the download and the inference are blocking, so they run in
  a worker thread (run_in_threadpool). That keeps the event loop free, so
  /model_status and /health stay responsive while a model downloads.
- Inference is serialized with a lock: requests form a queue and are processed
  one at a time, which is both safe and predictable for a single-user tool.
- Execution provider: defaults to CPU. The onnxruntime CoreML provider is fast
  for some models but hangs on others on Apple Silicon (large BiRefNet/ISNet
  models in particular), so CPU is the reliable default. CPU is also plenty fast
  for the lighter models (ISNet ~0.7s, U2Net ~0.3s). Override with the
  REMBG_PROVIDERS env var, e.g. REMBG_PROVIDERS=CoreMLExecutionProvider,CPUExecutionProvider
"""

from __future__ import annotations

import io
import os
import glob
import time
import asyncio
import logging
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from PIL import Image
from rembg import new_session, remove

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("remove-bg-local")

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

AVAILABLE_MODELS = {
    "isnet-general-use": "ISNet General (default — fast, very good quality)",
    "u2net": "U2Net (classic, fastest)",
    "u2net_human_seg": "U2Net Human (people only, fast)",
    "birefnet-general-lite": "BiRefNet Lite (high quality, slower)",
    "birefnet-general": "BiRefNet General (best quality, slowest)",
    "birefnet-portrait": "BiRefNet Portrait (people, best quality, slow)",
}

# Approximate download size in MB (one-time, cached afterwards). Used only to
# tell the user what to expect on the first-run download screen.
MODEL_SIZES_MB = {
    "isnet-general-use": 170,
    "u2net": 170,
    "u2net_human_seg": 170,
    "birefnet-general-lite": 224,
    "birefnet-general": 930,
    "birefnet-portrait": 930,
}

# Rich, human-readable details for each model. Shown on the "Models" page in the
# UI so people can pick the right one. Times are rough per-image figures on
# Apple Silicon using CPU execution.
MODEL_INFO = {
    "isnet-general-use": {
        "title": "ISNet General",
        "tagline": "Recommended for everything",
        "speed": "Fast (~1s)",
        "quality": "Very good",
        "best_for": "Default for any image",
        "description": (
            "The default. A strong balance of speed and quality, reliable on "
            "photos, product shots and people. Fast on CPU and accurate in most "
            "situations, which makes it the best first choice."
        ),
    },
    "u2net": {
        "title": "U2Net",
        "tagline": "Fast, simple subjects",
        "speed": "Fastest (~0.5s)",
        "quality": "Good",
        "best_for": "Simple subjects, products",
        "description": (
            "The classic background-removal model. Very fast and good for "
            "subjects with clear edges, such as product photos on plain "
            "backgrounds. Edges can be rougher than ISNet or BiRefNet."
        ),
    },
    "u2net_human_seg": {
        "title": "U2Net Human",
        "tagline": "Recommended for people",
        "speed": "Fastest (~0.5s)",
        "quality": "Good (people only)",
        "best_for": "People, quick cut-outs",
        "description": (
            "Trained specifically to segment people. Fast and handy for "
            "portraits or full-body shots when you do not need the very best "
            "hair detail. Not meant for objects or animals."
        ),
    },
    "birefnet-general-lite": {
        "title": "BiRefNet Lite",
        "tagline": "High quality, a bit slower",
        "speed": "Slower (~9s)",
        "quality": "High",
        "best_for": "High quality, reasonable wait",
        "description": (
            "A lighter version of BiRefNet. Close to the full model in quality "
            "but noticeably faster. A good step up from ISNet when you want "
            "cleaner edges and can wait a few seconds."
        ),
    },
    "birefnet-general": {
        "title": "BiRefNet General",
        "tagline": "Best quality, slow",
        "speed": "Slowest (~20s)",
        "quality": "Best",
        "best_for": "Maximum quality, any image",
        "description": (
            "State-of-the-art general segmentation (2024). The highest quality "
            "for difficult images, with the finest edges. Large (~930 MB) and "
            "slow on CPU, so use it when quality matters more than speed."
        ),
    },
    "birefnet-portrait": {
        "title": "BiRefNet Portrait",
        "tagline": "Best for people, slow",
        "speed": "Slow (~20s)",
        "quality": "Best (people)",
        "best_for": "People with difficult hair",
        "description": (
            "BiRefNet tuned for people. The best option for portraits with "
            "loose or fly-away hair, especially combined with alpha matting in "
            "the advanced options. Large and slow, like BiRefNet General."
        ),
    },
}

DEFAULT_MODEL = os.environ.get("REMBG_MODEL", "isnet-general-use")
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "30"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

# Execution providers for onnxruntime. CPU is the reliable default (CoreML hangs
# on some models on Apple Silicon). Override with REMBG_PROVIDERS if you want to
# experiment, e.g. "CoreMLExecutionProvider,CPUExecutionProvider".
PROVIDERS = [
    p.strip()
    for p in os.environ.get("REMBG_PROVIDERS", "CPUExecutionProvider").split(",")
    if p.strip()
]

# Where rembg caches the ONNX model files.
U2NET_HOME = os.path.expanduser(os.environ.get("U2NET_HOME") or "~/.u2net")


def model_file(name: str) -> str:
    return os.path.join(U2NET_HOME, name + ".onnx")


def is_downloaded(name: str) -> bool:
    return os.path.isfile(model_file(name))


def download_progress(name: str):
    """Best-effort download progress (0..1) while a model is being fetched.

    rembg/pooch downloads to a temporary ``tmp*`` file in the cache dir and
    renames it to ``<name>.onnx`` when finished, so we estimate progress from
    the size of the newest temp file vs the model's expected size. Returns 1.0
    when the final file already exists, or None if it cannot be estimated.
    """
    if is_downloaded(name):
        return 1.0
    total = MODEL_SIZES_MB.get(name, 0) * 1024 * 1024
    if not total:
        return None
    try:
        tmps = glob.glob(os.path.join(U2NET_HOME, "tmp*"))
        if not tmps:
            return 0.0
        newest = max(tmps, key=os.path.getmtime)
        return min(0.99, os.path.getsize(newest) / total)
    except OSError:
        return None


# Cached model sessions + load state.
_SESSIONS: dict[str, object] = {}
_MODEL_STATE: dict[str, str] = {}   # name -> "loading" | "ready" | "error"
_MODEL_ERROR: dict[str, str] = {}
_LOAD_LOCKS: dict[str, asyncio.Lock] = {}
# Serializes inference (processing queue). Created lazily inside the running
# event loop: on Python 3.9 an asyncio.Lock() built at import time binds to the
# wrong loop and raises "got Future attached to a different loop" under uvicorn.
_INFER_LOCK: asyncio.Lock | None = None


def get_infer_lock() -> asyncio.Lock:
    global _INFER_LOCK
    if _INFER_LOCK is None:
        _INFER_LOCK = asyncio.Lock()
    return _INFER_LOCK


def _check_model(model_name: str) -> None:
    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model: {model_name}. Options: {list(AVAILABLE_MODELS.keys())}",
        )


def state_of(model_name: str) -> str:
    if model_name in _SESSIONS:
        return "ready"
    return _MODEL_STATE.get(model_name, "idle")


async def ensure_session(model_name: str):
    """Return a rembg session, loading (and downloading) it if needed.

    The blocking load runs in a worker thread so the event loop stays free.
    A per-model lock makes sure we only load each model once even if several
    requests arrive at the same time.
    """
    _check_model(model_name)
    if model_name in _SESSIONS:
        return _SESSIONS[model_name]

    lock = _LOAD_LOCKS.setdefault(model_name, asyncio.Lock())
    async with lock:
        if model_name in _SESSIONS:
            return _SESSIONS[model_name]
        _MODEL_STATE[model_name] = "loading"
        _MODEL_ERROR.pop(model_name, None)
        log.info("Loading model %s (first use may download ~%d MB)...",
                 model_name, MODEL_SIZES_MB.get(model_name, 0))
        t0 = time.time()
        try:
            session = await run_in_threadpool(new_session, model_name, providers=PROVIDERS)
        except Exception as exc:  # noqa: BLE001
            _MODEL_STATE[model_name] = "error"
            _MODEL_ERROR[model_name] = str(exc)
            log.exception("Failed to load model %s", model_name)
            raise
        _SESSIONS[model_name] = session
        _MODEL_STATE[model_name] = "ready"
        log.info("Model %s ready in %.1fs", model_name, time.time() - t0)
        return session


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="remove-background-local", version="1.5.0")

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    index = STATIC_DIR / "index.html"
    if not index.exists():
        return JSONResponse({"error": "static/index.html not found"}, status_code=500)
    # Never cache the UI shell, so a reload always serves the latest version.
    return FileResponse(str(index), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})


@app.get("/health")
async def health():
    return {
        "ok": True,
        "default_model": DEFAULT_MODEL,
        "loaded_models": list(_SESSIONS.keys()),
    }


@app.get("/models")
async def models():
    return {
        "default": DEFAULT_MODEL,
        "available": AVAILABLE_MODELS,
        "sizes_mb": MODEL_SIZES_MB,
        "info": MODEL_INFO,
        "downloaded": {name: is_downloaded(name) for name in AVAILABLE_MODELS},
    }


@app.get("/model_status")
async def model_status(model: str = DEFAULT_MODEL):
    _check_model(model)
    state = state_of(model)
    downloaded = is_downloaded(model)
    if state == "loading":
        progress = download_progress(model)
    elif state == "ready" or downloaded:
        progress = 1.0
    else:
        progress = 0.0
    return {
        "model": model,
        "state": state,
        "downloaded": downloaded,
        "progress": progress,
        "size_mb": MODEL_SIZES_MB.get(model),
        "error": _MODEL_ERROR.get(model),
    }


@app.post("/warmup")
async def warmup(model: str = Form(DEFAULT_MODEL)):
    """Start loading a model without waiting for it to finish.

    Returns immediately; poll /model_status to know when it is ready.
    """
    _check_model(model)
    if model not in _SESSIONS and state_of(model) != "loading":
        async def _bg():
            try:
                await ensure_session(model)
            except Exception:  # noqa: BLE001
                pass  # state already recorded in _MODEL_STATE / _MODEL_ERROR
        asyncio.create_task(_bg())
    return {"model": model, "state": state_of(model), "size_mb": MODEL_SIZES_MB.get(model)}


def _encode_png(out_img: Image.Image) -> bytes:
    buf = io.BytesIO()
    out_img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


@app.post("/remove")
async def remove_background(
    image: UploadFile = File(...),
    model: str = Form(DEFAULT_MODEL),
    alpha_matting: bool = Form(False),
    alpha_matting_foreground_threshold: int = Form(240),
    alpha_matting_background_threshold: int = Form(10),
    alpha_matting_erode_size: int = Form(10),
):
    """Process an image and return a PNG with a transparent background."""
    # Validate size
    raw = await image.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty image")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large (max {MAX_UPLOAD_MB} MB)",
        )

    # Validate that it is an image
    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()  # integrity check only
        img = Image.open(io.BytesIO(raw))  # reopen to use
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}")

    log.info(
        "Processing %s (%dx%d, %.1f KB) with model=%s",
        image.filename, img.width, img.height, len(raw) / 1024, model,
    )

    # Loads/downloads the model if needed (in a worker thread).
    session = await ensure_session(model)

    # Serialize inference: requests queue up and run one at a time.
    t0 = time.time()
    try:
        async with get_infer_lock():
            out = await run_in_threadpool(
                remove,
                img,
                session=session,
                alpha_matting=alpha_matting,
                alpha_matting_foreground_threshold=alpha_matting_foreground_threshold,
                alpha_matting_background_threshold=alpha_matting_background_threshold,
                alpha_matting_erode_size=alpha_matting_erode_size,
            )
    except Exception as exc:
        log.exception("Error processing image")
        raise HTTPException(status_code=500, detail=f"Processing error: {exc}")
    elapsed = time.time() - t0

    png_bytes = await run_in_threadpool(_encode_png, out)
    log.info("Done in %.2fs", elapsed)

    headers = {
        "X-Processing-Time": f"{elapsed:.2f}",
        "X-Model": model,
        "Content-Disposition": f'inline; filename="{Path(image.filename or "out").stem}_nobg.png"',
    }
    return Response(content=png_bytes, media_type="image/png", headers=headers)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

def main():
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "7860"))

    log.info("=" * 60)
    log.info("remove-bg-local starting on http://%s:%d", host, port)
    log.info("Default model: %s", DEFAULT_MODEL)
    log.info("Execution providers: %s", ", ".join(PROVIDERS))
    log.info("Max upload size: %d MB", MAX_UPLOAD_MB)
    log.info("=" * 60)

    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
