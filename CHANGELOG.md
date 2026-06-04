# Changelog

## v1.11.0 — npm publish

- First version published to npm (auto-published from the GitHub release via the
  publish workflow using the NPM automation token)

## v1.10.0 — New logo & auto-refresh on update

- New single brand logo (the rm. squircle) used as favicon and app/dock icon;
  removed the dark/light variants
- `rm-bg update` now refreshes the installed desktop app after updating npm
  (macOS rebuilds the .app; Linux/Windows launchers already point at the package)

## v1.9.0 — Cross-platform install

- `rm-bg desktop install` now works on Linux (.desktop launcher) and Windows
  (Start Menu shortcut) too, not just macOS (.app)
- `rm-bg desktop uninstall` removes the app/shortcut on any platform
- Ship app-icon.ico for the Windows shortcut

## v1.8.0 — Install as a Mac app

- `rm-bg desktop install` builds a real `Remove Background Local.app` into
  /Applications (own name, icon and bundle id); `rm-bg desktop uninstall` removes it
- Built locally from the cached Electron runtime, so no Gatekeeper prompt
- App bundle ships the SVG-derived `.icns` icon

## v1.7.1 — App icon & title

- Real-transparency SVG logos (logo-dark / logo-white) + PNGs, used as favicon and app/dock icon
- Window title and app name set to "Remove Background Local"
- Logos are favicon/icon only; the in-app wordmark is unchanged

## v1.7.0 — rm-bg CLI & desktop app

- `rm-bg` command with subcommands: web, start, stop, init, desktop, models (ls/pull/rm), update
- Desktop app via Electron (`rm-bg desktop`) showing the same UI in a native window
- `python server.py models ls|pull|rm` backend CLI

## v1.6.0 — Manage models & npx launcher

- Delete downloaded models from disk on the Models page
- Model dropdown only lets you pick downloaded models; others shown disabled (no more dot)
- npm/npx launcher: run with `npx -y remove-background-local`

## v1.5.0 — Grouped sessions & friendlier empty state

- Sidebar groups images by session; click a session to open it whole
- Reload starts an empty working session; past sessions stay saved
- Lost-puppy empty state and a README screenshot
- Card footer laid out cleanly: background / model / download
## v1.4.0 — Compact controls, close all & rename

- Compact top row: model on one side, actions on the other
- 'Close all' to clear the working view (kept in the sidebar)
- Renamed to 'rm.background local' with a not-affiliated disclaimer
## v1.3.0 — Per-image model, reprocess & relative time

- Show the model used per image; change it and reprocess
- Human-readable 'processed X ago' timestamps
- More reliable persistence; UI shell served with no-cache
## v1.2.0 — Persistent sessions & flexible export

- Sessions persist locally in the browser (IndexedDB)
- Download as PNG / WEBP / JPG with a chosen background
- Per-result background, independent of the global default
- shadcn-style model dropdown; per-model download status and progress
## v1.1.0 — Models page, tests & cleanup

- Models page in the top menu (speed/quality/size per model)
- Removed all emojis in favor of inline SVG icons (enforced by a test)
- pytest suite + GitHub Actions CI + AGENTS.md contributor guide