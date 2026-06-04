# remove-bg-local

Your own remove.bg running on localhost. No limits, no uploading your images to anyone's server, no paying for an API.

It uses **BiRefNet** (2024) — one of the best open-source models for background segmentation, with quality very close to remove.bg in most cases.

## Features

- Web UI with drag & drop (paste from clipboard works too)
- Switch between 6 models depending on the case (general, portrait, lite, etc.)
- Alpha matting mode for fine edges (hair, plants)
- 100% local processing — your images never leave your machine
- No limits on count or resolution (beyond the file-size cap)
- CoreML acceleration on Apple Silicon

## Requirements

- Mac with Apple Silicon (also works on Intel and other systems, just slower)
- Python 3.9 or newer
- ~2 GB of free disk space (models + dependencies)

Check that you have Python:

```bash
python3 --version
```

If you don't, install it from [python.org](https://www.python.org/downloads/) or with Homebrew: `brew install python`

## Install and run

```bash
cd remove-bg-local
./run.sh
```

The first run will:

1. Create a `.venv` virtual environment
2. Install the Python dependencies (can take 2–5 minutes)
3. Start the server

After that, every `./run.sh` starts in a few seconds.

Open in your browser: **http://127.0.0.1:7860**

> The first time you use a model it is downloaded automatically (between 100 and 400 MB depending on the model). After that it stays cached in `~/.u2net/`.

> **Moved the folder?** A Python virtualenv stores absolute paths, so a copied/moved `.venv` is broken. `run.sh` detects this automatically and rebuilds the environment — you don't have to do anything.

## Usage

1. Drag an image onto the box (or click to choose one, or paste with Cmd+V)
2. Wait a few seconds
3. Download the PNG with a transparent background

### Which model to choose

| Model | When to use it | Speed |
|---|---|---|
| `birefnet-general` | Default. Best quality for any image. | Medium |
| `birefnet-general-lite` | When you need speed without losing much quality. | Fast |
| `birefnet-portrait` | Photos of people, especially with difficult hair. | Medium |
| `isnet-general-use` | Fast alternative to BiRefNet general. | Fast |
| `u2net` | The classic — good for simple products. | Very fast |
| `u2net_human_seg` | People only, very fast. | Very fast |

### Alpha matting (optional)

In the "Advanced options" section you can enable **alpha matting**. It's slower but gives better edges in difficult cases (loose hair, transparency, mesh).

- **FG threshold**: pixels clearly belonging to the object (default 240, raise it if it eats parts of the object)
- **BG threshold**: pixels clearly belonging to the background (default 10, lower it if it leaves background leftovers)
- **Erode**: fine edge adjustment

## Advanced configuration

Environment variables before running `./run.sh`:

```bash
HOST=0.0.0.0 PORT=8000 ./run.sh         # Change port / expose to the local network
REMBG_MODEL=birefnet-portrait ./run.sh  # Change the default model
MAX_UPLOAD_MB=100 ./run.sh              # Raise the size limit
```

## Programmatic use (no UI)

The POST `/remove` endpoint accepts `multipart/form-data`:

```bash
curl -X POST http://127.0.0.1:7860/remove \
  -F "image=@photo.jpg" \
  -F "model=birefnet-general" \
  -o photo_nobg.png
```

Process a whole folder in batch:

```bash
for f in *.jpg; do
  curl -s -X POST http://127.0.0.1:7860/remove \
    -F "image=@$f" \
    -F "model=birefnet-general" \
    -o "${f%.*}_nobg.png"
  echo "ok: $f"
done
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Web UI |
| `POST` | `/remove` | Remove background, returns a transparent PNG |
| `GET` | `/models` | List of available models |
| `GET` | `/health` | Server status |

## Expected performance on Mac Apple Silicon

- M1/M2: 1–3 seconds per image (HD)
- M3/M4: 0.5–2 seconds per image (HD)
- 4K images: ~5–10 seconds

The first call is slower because it loads the model into memory (~5–15 seconds depending on the model).

## Troubleshooting

**`onnxruntime` install error**: on some older Macs it can fail. Try:

```bash
.venv/bin/pip install onnxruntime --upgrade
```

**The model won't download**: check your internet connection — the first time it needs to fetch the model from Hugging Face / GitHub. After that it works 100% offline.

**Bad quality on some image**: try another model from the selector. For people with difficult hair, BiRefNet portrait + alpha matting is usually best.

**Port 7860 in use**: change it with `PORT=8000 ./run.sh`

## Project structure

```
remove-bg-local/
├── server.py          # FastAPI backend
├── static/
│   └── index.html     # Frontend (single file)
├── requirements.txt   # Python dependencies
├── run.sh             # Startup script
└── README.md          # This file
```

## Model licenses

- **BiRefNet**: MIT (commercial use OK)
- **ISNet**: Apache 2.0 (commercial use OK)
- **U2Net**: Apache 2.0 (commercial use OK)

All open source and usable commercially at no cost.

## License

MIT
