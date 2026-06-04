#!/usr/bin/env node
/*
 * remove-background-local launcher.
 *
 * Bootstraps a Python virtualenv, installs the dependencies and starts the
 * server, so `npx remove-background-local` is a single command. It still needs
 * Python 3.9+ on the machine (Node cannot install Python for you), and the first
 * run downloads the default model.
 */
"use strict";

const { spawnSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const APP_DIR = path.join(__dirname, "..");                 // package root (has server.py)
const HOME = process.env.RBL_HOME || path.join(os.homedir(), ".remove-background-local");
const VENV_DIR = path.join(HOME, "venv");
const IS_WIN = process.platform === "win32";
const VENV_PY = IS_WIN ? path.join(VENV_DIR, "Scripts", "python.exe") : path.join(VENV_DIR, "bin", "python");
const PORT = process.env.PORT || "7860";
const HOST = process.env.HOST || "127.0.0.1";

function log(msg) { process.stdout.write(">> " + msg + "\n"); }
function run(cmd, args, opts) { return spawnSync(cmd, args, Object.assign({ stdio: "inherit" }, opts || {})); }

function findPython() {
  for (const c of ["python3", "python"]) {
    const r = spawnSync(c, ["-c", "import sys; sys.exit(0 if sys.version_info[:2] >= (3, 9) else 1)"]);
    if (r.status === 0) return c;
  }
  return null;
}
function venvHealthy() {
  if (!fs.existsSync(VENV_PY)) return false;
  return spawnSync(VENV_PY, ["-c", "import sys"]).status === 0;
}
function depsInstalled() {
  return spawnSync(VENV_PY, ["-c", "import fastapi, uvicorn, rembg, PIL, multipart, onnxruntime"]).status === 0;
}
function openBrowser(url) {
  const cmd = IS_WIN ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = IS_WIN ? ["/c", "start", "", url] : [url];
  try { spawn(cmd, args, { stdio: "ignore", detached: true }).unref(); } catch (e) { /* ignore */ }
}

function main() {
  const py = findPython();
  if (!py) {
    process.stderr.write(
      "\nremove-background-local needs Python 3.9 or newer.\n" +
      "Install it from https://www.python.org/downloads/ (or `brew install python`) and try again.\n\n"
    );
    process.exit(1);
  }

  fs.mkdirSync(HOME, { recursive: true });

  if (!venvHealthy()) {
    log("Creating Python environment (first run)...");
    if (run(py, ["-m", "venv", VENV_DIR]).status !== 0) { process.stderr.write("Failed to create the virtualenv.\n"); process.exit(1); }
  }
  if (!depsInstalled()) {
    log("Installing dependencies (first run can take 2-5 min)...");
    run(VENV_PY, ["-m", "pip", "install", "--upgrade", "pip"]);
    if (run(VENV_PY, ["-m", "pip", "install", "-r", path.join(APP_DIR, "requirements.txt")]).status !== 0) {
      process.stderr.write("Failed to install dependencies.\n"); process.exit(1);
    }
  }

  const url = `http://${HOST}:${PORT}`;
  log(`Starting server on ${url}`);
  log("(Ctrl+C to stop)");
  setTimeout(() => openBrowser(url), 2500);

  const child = spawn(VENV_PY, [path.join(APP_DIR, "server.py")], {
    stdio: "inherit",
    env: Object.assign({}, process.env, { HOST, PORT }),
  });
  child.on("exit", (code) => process.exit(code || 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

main();
