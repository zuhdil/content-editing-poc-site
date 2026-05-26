# content-editing-poc-site

The Next.js site half of the [Content Editing POC](https://github.com/zuhdil/content-editing-poc-content).
A one-page-per-route static site whose copy is driven by
`src/content/content.yml`, plus the sync engine that keeps that
yaml in step with a separate content repo edited via the GitHub UI.

Deployed to GitHub Pages: https://zuhdil.github.io/content-editing-poc-site/

## Layout

- `src/app/` — three routes (`/`, `/about`, `/features`) + shared layout.
- `src/content/` — `content.yml` (canonical copy), `content.schema.json`
  (dev-authored constraints), `content.snapshot.json` (sync baseline,
  bot-written), `content.conflicts.json` (bot-written on conflict),
  and `loader.ts` (build-time read + validation).
- `scripts/` — the sync engine:
  - `sync.mjs` — the 3-way merge orchestrator (`npm run content:sync`).
  - `resolve-conflicts.mjs` — interactive conflict resolver (`npm run content:resolve`).
  - `bootstrap-content-repo.mjs` — one-shot content-repo seeder (`npm run content:bootstrap`).
  - `export-schema.mjs` — projects the schema into the content repo.
  - `lib/` — pure, unit-tested building blocks (merge, yaml-io, snapshot, conflicts, content-repo IO, git).
- `tests/` — `unit/` (pure logic) and `integration/` (orchestrator against temp repos).
- `.github/workflows/` — `content-sync.yml` (runs the engine on dispatch/push)
  and `deploy-pages.yml` (build + publish).

## Common commands

    npm run dev       # local dev server
    npm run build     # static export to out/
    npm test          # run the vitest suite
    npm run content:sync       # run the sync engine (needs ../content)
    npm run content:resolve    # resolve recorded conflicts

## How the sync works

See the design spec and implementation plan in the POC root's
`docs/superpowers/` directory for the full picture, including the
3-way merge table and the conflict-resolution lifecycle.

