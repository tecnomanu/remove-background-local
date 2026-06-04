// Electron main process for `rm-bg desktop`.
// Starts the Python server (unless one is already running) and shows the same
// web UI in a native window. Launched by bin/cli.js with RBL_PY / RBL_APP set.
"use strict";

const { app, BrowserWindow, shell, nativeImage } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");

const APP_NAME = "Remove Background Local";
// When launched by `rm-bg desktop` these come from the environment. When running
// as a packaged .app they are not set, so fall back to the bundled files
// (next to this script) and the venv created under the user's home.
const APP_DIR = process.env.RBL_APP || __dirname;
const DEFAULT_VENV_PY = path.join(
  os.homedir(), ".remove-background-local", "venv",
  process.platform === "win32" ? "Scripts\\python.exe" : "bin/python"
);
const PY = process.env.RBL_PY || (fs.existsSync(DEFAULT_VENV_PY) ? DEFAULT_VENV_PY : "python3");
const HOST = process.env.HOST || "127.0.0.1";
const PORT = process.env.PORT || "7860";
const URL = `http://${HOST}:${PORT}`;
const ICON = path.join(APP_DIR, "static", "logo-dark.png");

app.setName(APP_NAME);

let server = null;
let startedByUs = false;

function isUp() {
  return new Promise((res) => {
    const req = http.get(URL + "/health", (r) => { r.resume(); res(r.statusCode === 200); });
    req.on("error", () => res(false));
    req.setTimeout(1200, () => { req.destroy(); res(false); });
  });
}
async function waitUp() {
  for (let i = 0; i < 200; i++) { if (await isUp()) return true; await new Promise((r) => setTimeout(r, 800)); }
  return false;
}
function startServer() {
  server = spawn(PY, [path.join(APP_DIR, "server.py")], {
    env: Object.assign({}, process.env, { HOST, PORT }),
    stdio: "ignore",
  });
  startedByUs = true;
}
function stopServer() {
  if (server && startedByUs) { try { server.kill(); } catch (e) { /* ignore */ } server = null; }
}

const SPLASH =
  "data:text/html," + encodeURIComponent(
    "<body style='margin:0;background:#0f0f12;color:#9b9bab;font-family:-apple-system,sans-serif;" +
    "display:flex;align-items:center;justify-content:center;height:100vh'>" +
    "<div style='text-align:center'><div style='font-size:18px;color:#e7e7ee'>rm.background local</div>" +
    "<div style='margin-top:8px;font-size:13px'>Starting the engine, one moment…</div></div></body>");

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 820, minWidth: 720, minHeight: 520,
    backgroundColor: "#0f0f12", title: APP_NAME, icon: ICON,
    webPreferences: { contextIsolation: true },
  });
  // Keep the native window title fixed (don't let the page override it).
  win.on("page-title-updated", (e) => { e.preventDefault(); win.setTitle(APP_NAME); });
  // Open external links (e.g. the cafecito footer) in the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(URL)) { shell.openExternal(url); return { action: "deny" }; }
    return { action: "allow" };
  });
  win.loadURL(SPLASH);
  const ok = await waitUp();
  if (ok) win.loadURL(URL);
  else win.loadURL("data:text/html," + encodeURIComponent(
    "<body style='margin:0;background:#0f0f12;color:#ff6b6b;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>" +
    "Could not start the server.</body>"));
}

app.whenReady().then(async () => {
  // In a packaged .app the bundle's .icns is used; only override in dev mode.
  if (process.platform === "darwin" && app.dock && !app.isPackaged) {
    try { app.dock.setIcon(nativeImage.createFromPath(ICON)); } catch (e) { /* ignore */ }
  }
  if (!(await isUp())) startServer();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { stopServer(); if (process.platform !== "darwin") app.quit(); });
app.on("quit", stopServer);
