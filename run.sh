#!/usr/bin/env bash
# Starts remove-bg-local on http://127.0.0.1:7860
# Creates a virtualenv automatically on first run.

set -e

cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

VENV_DIR=".venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"

# 1) A virtualenv stores absolute paths. If this project was moved or copied
#    from another folder, the existing .venv points to the old location and is
#    broken. Detect that (or a missing venv) and rebuild from scratch.
venv_is_healthy() {
  [ -x "$VENV_DIR/bin/python" ] || return 1
  local prefix
  prefix="$("$VENV_DIR/bin/python" -c 'import sys; print(sys.prefix)' 2>/dev/null)" || return 1
  [ "$prefix" = "$PROJECT_DIR/$VENV_DIR" ]
}

if ! venv_is_healthy; then
  if [ -d "$VENV_DIR" ]; then
    echo ">> Existing virtualenv is missing or was moved here from another path. Rebuilding..."
    rm -rf "$VENV_DIR"
  else
    echo ">> Creating virtualenv in $VENV_DIR..."
  fi
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# 2) Make sure the key dependencies are installed. If any is missing, run
#    pip install (idempotent and fast when everything is already present).
NEED_INSTALL=0
"$VENV_DIR/bin/python" -c "import fastapi, uvicorn, rembg, PIL, multipart, onnxruntime" 2>/dev/null || NEED_INSTALL=1

if [ "$NEED_INSTALL" = "1" ]; then
  echo ">> Installing / updating dependencies (first run can take 2-5 min)..."
  "$VENV_DIR/bin/pip" install --upgrade pip
  "$VENV_DIR/bin/pip" install -r requirements.txt
fi

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-7860}"

echo ">> Starting server on http://$HOST:$PORT"
echo ">> (Ctrl+C to stop)"
echo ""

# The first time a model is used it gets downloaded (~100-400 MB depending on
# the model) and cached in ~/.u2net/.
exec "$VENV_DIR/bin/python" server.py
