# Changelog

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