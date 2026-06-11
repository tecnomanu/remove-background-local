# Changelog

## [1.15.2](https://github.com/tecnomanu/remove-background-local/compare/v1.15.1...v1.15.2) (2026-06-10)


### Bug Fixes

* **site:** enhance background demo and quality toggle features ([acb4a2f](https://github.com/tecnomanu/remove-background-local/commit/acb4a2f80717f7c44b53e22be29ee8edbfa66407))

## [1.15.1](https://github.com/tecnomanu/remove-background-local/compare/v1.15.0...v1.15.1) (2026-06-10)


### Bug Fixes

* **site:** cerrar gaps SEO de OpenGraph.to ([f0c0055](https://github.com/tecnomanu/remove-background-local/commit/f0c0055d16645f6120353e1d6773c4a33473ad03))
* **site:** og:image 1200x630 y dimensiones antes de type ([df3cc9a](https://github.com/tecnomanu/remove-background-local/commit/df3cc9ae5eb64ad64d52fc9b2b68a2f6d12460e8))
* **site:** og:image en JPEG para compatibilidad con Meta ([3a3566b](https://github.com/tecnomanu/remove-background-local/commit/3a3566bc76ef64c197f7a22f180a4606d04e0830))

## [1.15.0](https://github.com/tecnomanu/remove-background-local/compare/v1.14.0...v1.15.0) (2026-06-10)


### Features

* **site:** SEO social preview con screenshot.webp ([018762e](https://github.com/tecnomanu/remove-background-local/commit/018762e481a9a5f73465f2461a9c0ad1c43c054c))

## [1.14.0](https://github.com/tecnomanu/remove-background-local/compare/v1.13.0...v1.14.0) (2026-06-05)


### Features

* animated landing site (GSAP) + GitHub Pages deploy ([0d24206](https://github.com/tecnomanu/remove-background-local/commit/0d24206115dd4c560ac7edfdb27d98fc6d9c4f3a))
* **site:** inglés como idioma base + toggle ES, showcase alternado y footer con crédito/café ([4307d1e](https://github.com/tecnomanu/remove-background-local/commit/4307d1eee224a94cfe20434cfdc7ca8e6bfc2bb9))


### Bug Fixes

* **site:** nav rota a anchos intermedios + cache busting ([e266583](https://github.com/tecnomanu/remove-background-local/commit/e266583ddf5c1f054d160cbb0fc463b918926719))
* **site:** wordmark 'rm.background local' (solo el punto en color) + reencuadre del antes/después ([acb30b9](https://github.com/tecnomanu/remove-background-local/commit/acb30b90ffecee6fd996069613b1ea5ab6b07822))

## [1.13.0](https://github.com/tecnomanu/remove-background-local/compare/v1.12.0...v1.13.0) (2026-06-04)


### Features

* add 'rm-bg version' / --version / -v ([07c7410](https://github.com/tecnomanu/remove-background-local/commit/07c7410e53a84a4e9892dcb3823bf6ed01e05640))

## v1.12.0 — Port-in-use handling, auto-update on open, clearer docs

- If the server is already running, `rm-bg web`/`start` now point you to the
  URL instead of crashing with "address already in use"; clearer message when
  the port is taken by another app (server.py also checks before binding)
- `rm-bg web`/`desktop` check npm for a newer version on launch and update in
  place before starting (set RBL_NO_UPDATE=1 to skip)
- README: clearer npx (temporary) vs npm install -g (permanent) explanation

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
