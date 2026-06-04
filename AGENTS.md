# AGENTS.md

Guide for AI agents (and humans) working on **remove-background-local**. Read this before
making changes. It explains the architecture, the conventions, and — importantly
— how to test, because **every commit must keep the test suite green**.

## What this project is

A local web app to remove image backgrounds. A FastAPI backend wraps
[`rembg`](https://github.com/danielgatis/rembg) (ISNet / U2Net / BiRefNet ONNX
models) and serves a single-file web UI. Everything runs locally; images never
leave the machine.

## Repository layout

```
remove-background-local/
├── server.py              # FastAPI backend (all endpoints + model handling)
├── static/index.html      # Entire frontend (HTML + CSS + JS, single file)
├── run.sh                 # Start the server (creates/repairs the .venv)
├── run_tests.sh           # Run the test suite
├── requirements.txt       # Runtime dependencies
├── requirements-dev.txt   # Test dependencies (pytest, httpx)
├── conftest.py            # Puts repo root on sys.path for tests
├── tests/                 # pytest suite
└── .github/workflows/     # CI: runs pytest on push / PR
```

## Run it

```bash
./run.sh                 # http://127.0.0.1:7860
```

`run.sh` auto-creates `.venv`, and **rebuilds it if it was moved/copied** (a
virtualenv stores absolute paths, so a relocated `.venv` is broken — `run.sh`
detects a prefix mismatch and recreates it).

Useful env vars: `HOST`, `PORT`, `REMBG_MODEL`, `MAX_UPLOAD_MB`, `REMBG_PROVIDERS`.

## Testing — required before every commit

```bash
./run_tests.sh           # sets up deps if needed, then runs pytest
# or, if the venv is ready:
.venv/bin/python -m pytest -q
```

The suite (`tests/`) is fast (~1s) and needs **no network**: model loading and
inference are monkeypatched. CI (`.github/workflows/tests.yml`) runs the same
`pytest -q` on every push and pull request, so:

- **Do not commit with failing tests.** Run them first.
- When you change behavior, update or add tests in `tests/`.
- New endpoints, validation rules, or model metadata should come with a test.

## Architecture notes (don't regress these)

- **Execution provider is CPU by default** (`PROVIDERS`, env `REMBG_PROVIDERS`).
  The onnxruntime **CoreML provider hangs** on several models on Apple Silicon
  (it sits at 0% CPU forever, spamming "Context leak detected"). CPU is reliable
  and fast for the light models. Do not switch the default back to CoreML.
- **Default model is `isnet-general-use`** — fast + high quality. BiRefNet is the
  best quality but large (~930 MB) and slow on CPU, so it is not the default.
- **Non-blocking model loading.** `ensure_session` runs the blocking
  `new_session` in a worker thread (`run_in_threadpool`) so `/health` and
  `/model_status` stay responsive while a model downloads.
- **Inference is serialized** with `get_infer_lock()` — a lazily created
  `asyncio.Lock`. It must stay lazy: on Python 3.9 a module-level
  `asyncio.Lock()` binds to the wrong loop and raises "got Future attached to a
  different loop" on concurrent requests.
- **Queue** is both client-side (sequential job processing, results kept per
  card) and server-side (the inference lock). Adding an image while another is
  processing must never overwrite an existing result.
- **First-run setup overlay** in the UI polls `/model_status` and shows the
  one-time model download with a real progress bar (computed server-side from
  the size of the partial `tmp*` file in `~/.u2net/` vs the expected size).
- **`/model_status` reports `downloaded` and `progress`**; `/models` includes a
  `downloaded` map and a `tagline` per model. The Models page and the model
  dropdown use these to show which models are on disk and to drive the
  per-model Download buttons with progress.

## Frontend state & persistence (static/index.html)

- **Single session** model: the sidebar shows the processed images of the
  current session (a flat list). They **persist in IndexedDB** (DB
  `removebg-local`, store `results`, input + output Blobs) so a reload never
  loses work. "Clear" wipes the session (jobs + IndexedDB). Per-image trash
  deletes one; per-card close (x) only hides a card from the results view.
- The root (`/`) is served with `Cache-Control: no-cache` so a reload always
  gets the latest UI (avoids stale cached versions).
- **Result background**: a global default picker plus an independent per-card
  picker. Changing a card only affects that card (`job.bg`); the global is the
  default for non-overridden cards (`effectiveBg = job.bg ?? resultBg`).
- **Each result card** shows the model it used and a human-readable
  "processed X ago" time, plus a Model selector + Reprocess button (Reprocess
  confirms, then re-runs that image with the chosen model, replacing the old
  result).
- **Downloads** are produced client-side via canvas in PNG / WEBP / JPG, baking
  in the chosen background (JPG always gets a solid background since it has no
  alpha). "Download all" exports every done result.
- The **model selector** is a custom shadcn-style dropdown (not a native
  `<select>`) showing each model's title, size, a muted tagline, and a
  downloaded indicator dot.

## Naming / legal

- The product name in the UI and README is **rm.background local** (the
  repo / package slug stays `remove-background-local`). Do NOT use the "remove.bg"
  wordmark as the product name or imitate their visual identity. remove.bg may
  be mentioned only as a contextual comparison, alongside the disclaimer that
  this is an unofficial project, not affiliated with remove.bg / Canva.

## HTTP API

| Method | Path | Purpose |
|---|---|---|
| GET  | `/` | Web UI |
| POST | `/remove` | Remove background → transparent PNG (`multipart/form-data`) |
| GET  | `/models` | Models, sizes, and rich `info` for the Models page |
| GET  | `/model_status?model=NAME` | `idle` / `loading` / `ready` / `error` |
| POST | `/warmup` | Start loading a model in the background (non-blocking) |
| GET  | `/health` | Status |

## Conventions

- **Language: English** for UI text, code, comments, and docs.
- **NO EMOJIS** in the UI or backend. The user dislikes them. Use inline **SVG
  icons** instead (see `ICON_CLOSE`, `ICON_TRASH`, `ICON_WARN` in
  `static/index.html`, and the coffee SVG in the footer). This is enforced by
  `tests/test_no_emojis.py`, which scans `static/index.html`, `server.py`, and
  `run.sh`. Examples of what NOT to put in those files: 🗑 ✕ ⚠ ☕ ✅ 🚀 — and any
  other emoji. Markdown docs (this file, `README.md`) may mention emojis.
- **Single-file frontend.** Keep the UI in `static/index.html` (HTML + CSS + JS
  together) unless there is a strong reason to split it.
- **Layout contract:** the header and footer are fixed; only the results pane
  (and the sidebar / Models page) scroll. The controls, drop zone, and options
  stay fixed. Keep `.card { flex: 0 0 auto }` so result cards don't collapse.

## How to add a model

1. Add it to `AVAILABLE_MODELS` (id → short label) in `server.py`.
2. Add its approximate download size to `MODEL_SIZES_MB`.
3. Add a full entry to `MODEL_INFO` (`title`, `speed`, `quality`, `best_for`,
   `description`) — this powers the Models page.
4. `test_models_payload` will check the new entry has complete info. Run tests.

## Release process

1. Make sure tests pass: `./run_tests.sh`.
2. Bump the version in **three** places so they stay in sync:
   `package.json` (`version`), `server.py` (`FastAPI(version=...)`) and the
   footer in `static/index.html` (`<b id="ver">`). Add a `CHANGELOG.md` entry.
3. Commit, then tag and create the GitHub release:
   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   gh release create vX.Y.Z --title "vX.Y.Z — ..." --notes "..."
   ```
4. **npm publish is automated:** the `publish` workflow runs on every published
   GitHub release and pushes the `package.json` version to npm (needs the repo
   secret `NPM_TOKEN`, an npm Automation token). First publish can also be done
   manually (`npm login && npm publish`). `npm publish` fails if that version is
   already on npm, so each release must carry a new `package.json` version.
