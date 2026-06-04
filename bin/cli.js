#!/usr/bin/env node
/*
 * rm-bg / remove-background-local launcher.
 *
 * Subcommands:
 *   rm-bg web            Start the web server in the foreground (Ctrl+C to stop)
 *   rm-bg start          Start the server in the background
 *   rm-bg stop           Stop the background server
 *   rm-bg init           Set up the environment and download the default model
 *   rm-bg desktop        Open as a desktop app (Electron)
 *   rm-bg models ls               List models and which are downloaded
 *   rm-bg models pull --model X   Download a model
 *   rm-bg models rm   --model X   Delete a downloaded model
 *   rm-bg update         Update to the latest published version
 *   rm-bg help           Show this help
 *
 * Needs Python 3.9+ already installed (Node cannot install Python for you).
 */
"use strict";

const { spawnSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

const APP_DIR = path.join(__dirname, "..");
const HOME = process.env.RBL_HOME || path.join(os.homedir(), ".remove-background-local");
const VENV_DIR = path.join(HOME, "venv");
const IS_WIN = process.platform === "win32";
const VENV_PY = IS_WIN ? path.join(VENV_DIR, "Scripts", "python.exe") : path.join(VENV_DIR, "bin", "python");
const PID_FILE = path.join(HOME, "server.pid");
const LOG_FILE = path.join(HOME, "server.log");
const PORT = process.env.PORT || "7860";
const HOST = process.env.HOST || "127.0.0.1";
const URL = `http://${HOST}:${PORT}`;
const APP_NAME = "Remove Background Local";

function log(m) { process.stdout.write(">> " + m + "\n"); }
function err(m) { process.stderr.write(m + "\n"); }
function run(cmd, args, opts) { return spawnSync(cmd, args, Object.assign({ stdio: "inherit" }, opts || {})); }

function findPython() {
  for (const c of ["python3", "python"]) {
    const r = spawnSync(c, ["-c", "import sys; sys.exit(0 if sys.version_info[:2] >= (3, 9) else 1)"]);
    if (r.status === 0) return c;
  }
  return null;
}
function venvHealthy() {
  return fs.existsSync(VENV_PY) && spawnSync(VENV_PY, ["-c", "import sys"]).status === 0;
}
function depsInstalled() {
  return spawnSync(VENV_PY, ["-c", "import fastapi, uvicorn, rembg, PIL, multipart, onnxruntime"]).status === 0;
}
function ensureSetup() {
  const py = findPython();
  if (!py) {
    err("\nremove-background-local needs Python 3.9 or newer.\nInstall it from https://www.python.org/downloads/ (or `brew install python`) and try again.\n");
    process.exit(1);
  }
  fs.mkdirSync(HOME, { recursive: true });
  if (!venvHealthy()) {
    log("Creating Python environment (first run)...");
    if (run(py, ["-m", "venv", VENV_DIR]).status !== 0) { err("Failed to create the virtualenv."); process.exit(1); }
  }
  if (!depsInstalled()) {
    log("Installing dependencies (first run can take 2-5 min)...");
    run(VENV_PY, ["-m", "pip", "install", "--upgrade", "pip"]);
    if (run(VENV_PY, ["-m", "pip", "install", "-r", path.join(APP_DIR, "requirements.txt")]).status !== 0) {
      err("Failed to install dependencies."); process.exit(1);
    }
  }
}
function serverEnv() {
  return Object.assign({}, process.env, { HOST, PORT });
}
function openBrowser(url) {
  const cmd = IS_WIN ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = IS_WIN ? ["/c", "start", "", url] : [url];
  try { spawn(cmd, args, { stdio: "ignore", detached: true }).unref(); } catch (e) { /* ignore */ }
}
function isUp() {
  return new Promise((res) => {
    const req = http.get(URL + "/health", (r) => { r.resume(); res(r.statusCode === 200); });
    req.on("error", () => res(false));
    req.setTimeout(1500, () => { req.destroy(); res(false); });
  });
}
async function waitUp(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 120000)) { if (await isUp()) return true; await new Promise(r => setTimeout(r, 800)); }
  return false;
}
function readPid() { try { return parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10) || 0; } catch { return 0; } }
function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }

// ---- commands ----
function cmdWeb() {
  ensureSetup();
  log(`Starting server on ${URL}`);
  log("(Ctrl+C to stop)");
  setTimeout(() => openBrowser(URL), 2500);
  const child = spawn(VENV_PY, [path.join(APP_DIR, "server.py")], { stdio: "inherit", env: serverEnv() });
  try { fs.writeFileSync(PID_FILE, String(child.pid)); } catch {}
  child.on("exit", (code) => { try { fs.unlinkSync(PID_FILE); } catch {} process.exit(code || 0); });
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}
async function cmdStart() {
  const pid = readPid();
  if (pid && pidAlive(pid)) { log(`Already running (pid ${pid}) on ${URL}`); return; }
  ensureSetup();
  log("Starting server in the background...");
  const out = fs.openSync(LOG_FILE, "a");
  const child = spawn(VENV_PY, [path.join(APP_DIR, "server.py")], { stdio: ["ignore", out, out], env: serverEnv(), detached: true });
  fs.writeFileSync(PID_FILE, String(child.pid));
  child.unref();
  const ok = await waitUp(120000);
  if (ok) { log(`Running on ${URL} (pid ${child.pid})`); log(`Logs: ${LOG_FILE} — stop with: rm-bg stop`); openBrowser(URL); }
  else { log(`Started (pid ${child.pid}); still warming up. Logs: ${LOG_FILE}`); }
  process.exit(0);
}
function cmdStop() {
  const pid = readPid();
  if (!pid || !pidAlive(pid)) { log("No background server is running."); try { fs.unlinkSync(PID_FILE); } catch {} return; }
  try { process.kill(pid, "SIGTERM"); log(`Stopped server (pid ${pid}).`); } catch (e) { err("Could not stop: " + e.message); }
  try { fs.unlinkSync(PID_FILE); } catch {}
}
function cmdInit() {
  ensureSetup();
  log("Downloading the default model...");
  run(VENV_PY, [path.join(APP_DIR, "server.py"), "models", "pull"]);
  log("Ready. Start it with: rm-bg start   (or rm-bg web)");
}
function cmdModels(rest) {
  ensureSetup();
  const r = run(VENV_PY, [path.join(APP_DIR, "server.py"), "models", ...rest]);
  process.exit(r.status || 0);
}
function cmdUpdate() {
  log("Updating remove-background-local from npm...");
  const r = run(IS_WIN ? "npm.cmd" : "npm", ["install", "-g", "remove-background-local@latest"]);
  if (r.status !== 0) err("Update failed. If you run it with npx, just use `npx -y remove-background-local@latest`.");
}
function pkgVersion() { try { return require(path.join(APP_DIR, "package.json")).version || "0.0.0"; } catch { return "0.0.0"; } }

function ensureElectron() {
  const desktopDir = path.join(HOME, "desktop");
  const electronBin = path.join(desktopDir, "node_modules", ".bin", IS_WIN ? "electron.cmd" : "electron");
  if (!fs.existsSync(electronBin)) {
    log("Installing the desktop runtime (Electron) the first time...");
    fs.mkdirSync(desktopDir, { recursive: true });
    if (!fs.existsSync(path.join(desktopDir, "package.json"))) {
      fs.writeFileSync(path.join(desktopDir, "package.json"), JSON.stringify({ name: "rbl-desktop", private: true }, null, 2));
    }
    const r = run(IS_WIN ? "npm.cmd" : "npm", ["install", "electron@latest"], { cwd: desktopDir });
    if (r.status !== 0 || !fs.existsSync(electronBin)) { err("Could not install Electron. You can still use `rm-bg web`."); process.exit(1); }
  }
  return { desktopDir, electronBin };
}

function patchPlistName(plist) {
  if (!fs.existsSync(plist)) return;
  spawnSync("plutil", ["-replace", "CFBundleName", "-string", APP_NAME, plist]);
  spawnSync("plutil", ["-replace", "CFBundleDisplayName", "-string", APP_NAME, plist]);
}

function cmdDesktop(rest) {
  const sub = (rest[0] || "").toLowerCase();
  if (sub === "install") return cmdDesktopInstall();
  if (sub === "uninstall") return cmdDesktopUninstall();

  ensureSetup();
  const { desktopDir, electronBin } = ensureElectron();
  if (process.platform === "darwin") {
    const appBundle = path.join(desktopDir, "node_modules", "electron", "dist", "Electron.app");
    patchPlistName(path.join(appBundle, "Contents", "Info.plist"));
    try { fs.utimesSync(appBundle, new Date(), new Date()); } catch {}
  }
  log("Opening desktop app...");
  const child = spawn(electronBin, [path.join(APP_DIR, "electron", "main.js")], {
    stdio: "inherit",
    env: Object.assign({}, process.env, { RBL_PY: VENV_PY, RBL_APP: APP_DIR, HOST, PORT }),
  });
  child.on("exit", (code) => process.exit(code || 0));
}

function appInstallDir() {
  let dir = "/Applications";
  try { fs.accessSync(dir, fs.constants.W_OK); } catch { dir = path.join(os.homedir(), "Applications"); fs.mkdirSync(dir, { recursive: true }); }
  return dir;
}

function cmdDesktopInstall() {
  if (process.platform !== "darwin") {
    err("`rm-bg desktop install` is currently macOS-only. On this OS use `rm-bg desktop`."); process.exit(1);
  }
  ensureSetup();
  const { desktopDir } = ensureElectron();
  const srcApp = path.join(desktopDir, "node_modules", "electron", "dist", "Electron.app");
  if (!fs.existsSync(srcApp)) { err("Electron runtime not found."); process.exit(1); }

  const destApp = path.join(appInstallDir(), "Remove Background Local.app");
  log(`Building ${path.basename(destApp)} ...`);
  run("rm", ["-rf", destApp]);
  if (run("cp", ["-R", srcApp, destApp]).status !== 0) { err("Copy failed."); process.exit(1); }

  // Inject our app into the bundle (Electron loads Contents/Resources/app).
  const resApp = path.join(destApp, "Contents", "Resources", "app");
  fs.mkdirSync(resApp, { recursive: true });
  run("cp", [path.join(APP_DIR, "electron", "main.js"), path.join(resApp, "main.js")]);
  run("cp", [path.join(APP_DIR, "server.py"), path.join(resApp, "server.py")]);
  run("cp", [path.join(APP_DIR, "requirements.txt"), path.join(resApp, "requirements.txt")]);
  run("cp", ["-R", path.join(APP_DIR, "static"), path.join(resApp, "static")]);
  fs.writeFileSync(path.join(resApp, "package.json"), JSON.stringify(
    { name: "remove-background-local", productName: APP_NAME, version: pkgVersion(), main: "main.js" }, null, 2));

  // Icon + name.
  const icns = path.join(APP_DIR, "static", "app-icon.icns");
  if (fs.existsSync(icns)) run("cp", [icns, path.join(destApp, "Contents", "Resources", "electron.icns")]);
  const plist = path.join(destApp, "Contents", "Info.plist");
  patchPlistName(plist);
  spawnSync("plutil", ["-replace", "CFBundleIdentifier", "-string", "app.removebackground.local", plist]);

  try { fs.utimesSync(destApp, new Date(), new Date()); } catch {}
  spawnSync("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister", ["-f", destApp]);

  log(`Installed: ${destApp}`);
  log("Opening it now. You'll also find it in Launchpad / Applications.");
  run("open", [destApp]);
}

function cmdDesktopUninstall() {
  let removed = false;
  for (const base of ["/Applications", path.join(os.homedir(), "Applications")]) {
    const a = path.join(base, "Remove Background Local.app");
    if (fs.existsSync(a)) { run("rm", ["-rf", a]); removed = true; log("Removed " + a); }
  }
  if (!removed) log("No installed app found.");
}
function cmdHelp() {
  process.stdout.write(`
rm-bg — remove-background-local

Usage:
  rm-bg web                     Start the web server (foreground, Ctrl+C to stop)
  rm-bg start                   Start the server in the background
  rm-bg stop                    Stop the background server
  rm-bg init                    Set up and download the default model
  rm-bg desktop                 Open as a desktop app (Electron)
  rm-bg desktop install         Install it as a real Mac app in /Applications
  rm-bg desktop uninstall       Remove the installed Mac app
  rm-bg models ls               List models and which are downloaded
  rm-bg models pull --model X   Download a model
  rm-bg models rm   --model X   Delete a downloaded model
  rm-bg update                  Update to the latest version
  rm-bg help                    Show this help

Env: HOST (default 127.0.0.1), PORT (default 7860)
`);
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = (argv[0] || "web").toLowerCase();
  const rest = argv.slice(1);
  switch (cmd) {
    case "web": case "serve": return cmdWeb();
    case "start": case "up": return void cmdStart();
    case "stop": case "down": return cmdStop();
    case "init": case "setup": return cmdInit();
    case "desktop": case "app": return cmdDesktop(rest);
    case "models": case "model": return cmdModels(rest);
    case "update": case "upgrade": return cmdUpdate();
    case "help": case "-h": case "--help": return cmdHelp();
    default:
      err(`Unknown command: ${cmd}\n`); cmdHelp(); process.exit(1);
  }
}
main();
