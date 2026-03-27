# Frontend

This folder is the long-term home for the research browser and any later public-facing website.

Current stack:

- Astro for content-first routing and static generation
- React only for lightweight client-side search in the sidebar
- a small indexing script that reads the `research/` tree and emits a generated JSON index

Target structure:

- `src/` for UI application code
- `public/` for static assets
- `scripts/` for content indexing or build helpers

The frontend consumes repository research content without changing the research tree into application code.

Run locally:

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
cd frontend
npm run build
```

The current UI is intentionally minimal. It establishes scalable content loading, stable routes, and a basic browser shell so a later UI and UX pass can focus on presentation instead of reworking the app architecture.

## GitHub-only frontend publishing

This repository is configured so GitHub should only receive:

- `frontend/`
- `.github/workflows/deploy-frontend.yml`
- the root `.gitignore`

The frontend build is self-contained for CI. If the root `research/` folder is not present, the build script falls back to the committed `src/generated/research-index.json` snapshot.

GitHub Pages deployment target:

- `https://hsc00.github.io/sonata-research/`

```

```
