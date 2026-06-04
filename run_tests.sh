#!/usr/bin/env bash
# Run the test suite. Creates/uses the .venv and installs dev deps if needed.
# Agents: run this before committing — commits must keep the suite green.

set -e
cd "$(dirname "$0")"

VENV_DIR=".venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo ">> Creating virtualenv in $VENV_DIR..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# Install runtime + dev deps if pytest or any key import is missing.
if ! "$VENV_DIR/bin/python" -c "import pytest, httpx, fastapi, rembg, PIL, onnxruntime" 2>/dev/null; then
  echo ">> Installing test dependencies..."
  "$VENV_DIR/bin/pip" install --upgrade pip
  "$VENV_DIR/bin/pip" install -r requirements.txt -r requirements-dev.txt
fi

echo ">> Running tests..."
exec "$VENV_DIR/bin/python" -m pytest -q "$@"
