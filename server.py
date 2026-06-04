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
- GET  /            -> UI (HTML)
- POST /remove      -> Receives an image, returns a PNG with a transparent background
- GET  /models      -> List of available models
- GET  /health      -> Server status
"""

from __future__ import annotations

import io
import os
import time
import logging
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
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
    "birefnet-general": "BiRefNet General (best quality, 2024)",
    "birefnet-general-lite": "BiRefNet Lite (faster)",
    "birefnet-portrait": "BiRefNet Portrait (people)",
    "isnet-general-use": "ISNet General (fast, good quality)",
    "u2net": "U2Net (classic)",
    "u2net_human_seg": "U2Net Human (people only)",
}

DEFAULT_MODEL = os.environ.get("REMBG_MODEL", "birefnet-general")
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "30"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

# Cache of model sessions so we don't reload them on every request.
_SESSIONS: dict[str, object] = {}


def get_session(model_name: str):
    """Return (and cache) a rembg session for the given model."""
    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model: {model_name}. Options: {list(AVAILABLE_MODELS.keys())}",
        )
    if model_name not in _SESSIONS:
        log.info("Loading model %s (first time)...", model_name)
        t0 = time.time()
        _SESSIONS[model_name] = new_session(model_name)
        log.info("Model %s loaded in %.1fs", model_name, time.time() - t0)
    return _SESSIONS[model_name]


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="remove-bg-local", version="1.0.0")

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    index = STATIC_DIR / "index.html"
    if not index.exists():
        return JSONResponse({"error": "static/index.html not found"}, status_code=500)
    return FileResponse(str(index))


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
    }


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

    session = get_session(model)
    t0 = time.time()
    try:
        out = remove(
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
    log.info("Done in %.2fs", elapsed)

    # Serialize to PNG
    buf = io.BytesIO()
    out.save(buf, format="PNG", optimize=True)
    buf.seek(0)

    headers = {
        "X-Processing-Time": f"{elapsed:.2f}",
        "X-Model": model,
        "Content-Disposition": f'inline; filename="{Path(image.filename or "out").stem}_nobg.png"',
    }
    return Response(content=buf.getvalue(), media_type="image/png", headers=headers)


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
    log.info("Max upload size: %d MB", MAX_UPLOAD_MB)
    log.info("=" * 60)

    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
