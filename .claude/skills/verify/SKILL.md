---
name: verify
description: Build, launch, and drive Flamette Money locally to verify changes end-to-end.
---

# Verifying Flamette Money changes

## Build / static checks

- `pnpm build` — vite build (regenerates `src/routeTree.gen.ts`) + `tsc --noEmit`.
- `pnpm typecheck`, `pnpm lint` — fast standalone checks.

## Launch a scratch instance

No `.env` is required for dev: the app falls back to a built-in development
auth secret, and `DATABASE_URL` defaults to `file:./data/flamette-money.db`
relative to the cwd. Deleting `./data/` gives a fresh DB; all `migrations/*.sql`
apply on first request (watch for `[db] applied migration ...` in server logs).

- Port comes from `VITE_PORT` (default 5174). Set it in `.env` to avoid
  colliding with another running instance.
- Start via `.claude/launch.json` (`flamette-dev` → `pnpm dev`) with the
  browser preview tools, or plain `pnpm dev`.

## Drive it

1. Fresh DB redirects to `/sign-in`; the Sign up toggle is on the same page
   (there is no `/sign-up` route). Create a throwaway user.
2. Seed data: Settings → Sample data → Configure → Generate
   (`POST /api/seed/demo?Years=N`). Turn off "download backup after
   generation" first to avoid a file download.
3. Useful raw endpoints (authenticated browser session, e.g. via in-page
   `fetch`): `GET /api/profile/export-backup?type=flamette`,
   `POST /api/profile/import-backup` (FormData: `type`, `file`).
4. Inspect the scratch DB directly:
   `node -e "const db=require('better-sqlite3')('./data/flamette-money.db',{readonly:true}); ..."`

## Gotchas

- Base UI `Select` dropdowns respond unreliably to synthetic/CDP clicks in the
  browser pane; keyboard ArrowDown+Enter also flaky. Prefer edit-mode flows
  (values hydrate from data) or verify request/response at the API layer.
- `computer screenshot` can time out in this app's pane; `read_page`,
  `get_page_text`, and `javascript_tool` keep working — drive with those.
