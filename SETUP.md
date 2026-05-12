# PromotionOS — Fresh Machine Setup

Quick-start checklist for getting the repo running on a new development machine. For the full architecture / feature overview, see [README.md](./README.md).

---

## TL;DR

```bash
git clone https://github.com/Dachi1234/PromotionOS.git
cd PromotionOS

# 1. Install Node 20+ and pnpm 9+ (see below)
# 2. Install deps
pnpm install

# 3. Create env files (see "Environment files" below)
# 4. Run migrations against your DB
pnpm --filter @promotionos/db migrate

# 5. (Optional) seed demo data
pnpm seed

# 6. Start all three apps
pnpm dev
```

Three dev servers come up:

| App         | URL                       | Port |
|-------------|---------------------------|------|
| Engine API  | http://localhost:3000     | 3000 |
| Studio (admin) | http://localhost:3001 | 3001 |
| Canvas (builder + runtime) | http://localhost:3002 | 3002 |

---

## 1. Prerequisites

Install these on the new machine before anything else:

| Tool       | Version    | Notes |
|------------|------------|-------|
| **Node.js** | `>=20.x`  | LTS is fine. Check with `node -v`. |
| **pnpm**   | `>=9.x`    | `npm install -g pnpm@9` or use Corepack: `corepack enable && corepack prepare pnpm@9.15.3 --activate` |
| **Git**    | any modern | For cloning. |
| **PostgreSQL** | 15+    | Or use a hosted Neon database (recommended — the current dev config uses Neon). |
| **Redis**  | 6+         | Or use a hosted Upstash instance (recommended). Needed for BullMQ background workers. |

> The repo is a **pnpm workspaces + Turborepo** monorepo. Do **not** use `npm install` or `yarn` — the workspace protocol (`workspace:*`) only resolves with pnpm.

### Windows-specific

- Run terminals as **regular user**, not admin. Some pnpm commands trip on Windows ACLs when run elevated.
- If you see `EPERM` errors during install, close any running `node.exe`/IDE-watcher processes and retry.
- Long-path support: enable `git config --global core.longpaths true`.

### macOS / Linux

No special steps. If you don't want to install Postgres/Redis locally, just use Neon + Upstash (free tiers are plenty).

---

## 2. Clone & install

```bash
git clone https://github.com/Dachi1234/PromotionOS.git
cd PromotionOS
pnpm install
```

First install pulls the whole workspace tree and takes a couple of minutes. Subsequent installs are fast.

---

## 3. Environment files

The repo ships a single root `.env.example`. You need **three** real env files (none are committed):

### `apps/engine/.env`

```env
# Database — point at your own Postgres OR the shared Neon dev DB
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require

# Redis — local or hosted (Upstash)
REDIS_URL=redis://localhost:6379

# Engine config
PORT=3000
NODE_ENV=development
PLAYER_CONTEXT_PROVIDER=mock
REWARD_GATEWAY=mock
JWT_SECRET=<any-long-random-string>
ENABLE_WORKERS=true
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3002
```

### `apps/studio/.env.local`

```env
NEXT_PUBLIC_ENGINE_URL=http://localhost:3000
NEXT_PUBLIC_CANVAS_URL=http://localhost:3002
```

### `apps/canvas/.env.local`

```env
NEXT_PUBLIC_ENGINE_URL=http://localhost:3000
NEXT_PUBLIC_CANVAS_URL=http://localhost:3001
ALLOWED_FRAME_ANCESTORS=*
```

> **Tip — using the existing Neon + Upstash dev data:** if the other machine should share state with the current dev box, copy the `DATABASE_URL` and `REDIS_URL` values from the original machine's `apps/engine/.env` into the new one. The repo never commits these, so you have to transfer them out-of-band (1Password, secure note, whatever).

> **Fresh local Postgres instead?** Spin up a DB with `createdb promotionos`, set `DATABASE_URL=postgres://postgres:postgres@localhost:5432/promotionos`, then run migrations (next step).

---

## 4. Database

Run migrations once after install. Drizzle picks up `DATABASE_URL` from `apps/engine/.env`:

```bash
pnpm --filter @promotionos/db migrate
```

Optional — open Drizzle Studio to inspect tables:

```bash
pnpm --filter @promotionos/db studio
```

Optional — seed demo campaigns / players:

```bash
pnpm seed
```

---

## 5. Run the dev servers

From the repo root:

```bash
pnpm dev
```

Turbo brings up all three apps in parallel. Watch for:

```
engine:  Server listening at http://0.0.0.0:3000
studio:  ▲ Next.js 14.x · http://localhost:3001
canvas:  ▲ Next.js 14.x · http://localhost:3002
```

### Running one app at a time

```bash
pnpm --filter @promotionos/engine dev   # API only
pnpm --filter studio dev                # Admin only
pnpm --filter canvas dev                # Builder + runtime only
```

---

## 6. First-time sanity check

1. Open **http://localhost:3001** (Studio) → sign in / sign up. If you ran `pnpm seed`, demo credentials are in `scripts/seed-demo.ts`.
2. Create a campaign → step through the 7-step wizard → save.
3. Click **"Edit page"** on the campaign — Studio iframes Canvas's builder at `http://localhost:3002/builder/<campaignId>`.
4. Drop a Wheel widget, bind it to the mechanic from step 5, save.
5. Hit the campaign's public URL (`http://localhost:3002/<slug>`) to play the runtime.

If all four steps work, the stack is wired correctly.

---

## 7. Common gotchas

| Symptom | Fix |
|---------|-----|
| `pnpm install` fails with `ERR_PNPM_BAD_PM_VERSION` | You're on pnpm 8 or older. Run `corepack prepare pnpm@9.15.3 --activate`. |
| Engine boots but campaigns 401 in Studio | `JWT_SECRET` must match between restarts. Don't rotate it mid-session. |
| Canvas can't reach the engine (CORS) | Add the canvas/studio origins to `ALLOWED_ORIGINS` in `apps/engine/.env`. |
| BullMQ errors on startup | Redis isn't reachable. Check `REDIS_URL`; set `ENABLE_WORKERS=false` to skip workers if you don't need spin/condition processing. |
| Drizzle migrate says "no migrations found" | Run from repo root with the filter flag, not from inside `packages/db`. |
| Reveal editor or Wheel widget shows blank | Hard-refresh (Ctrl+Shift+R) — Craft.js caches the resolver across HMR. |
| Studio shows "20 rewards" when only 10 authored | Old bug from before the sync rewrite. Open Step 5, delete the duplicates, **Save** — the new reconcile pass cleans the engine. |
| Reveal label shows "CASH" not your label | You're on an older engine build. Pull main + restart the engine — `transformRewardConfig` now preserves `config.label`. |

---

## 8. What's in this repo

```
apps/
  engine/        Fastify API + BullMQ workers
  studio/        Next.js 14 admin panel (Step 1–7 wizard, dashboards)
  canvas/        Next.js 14 page builder (Craft.js) + player runtime
packages/
  db/            Drizzle schema + migrations
  types/         Shared TS types
  zod-schemas/   Shared Zod schemas (validation across the boundary)
scripts/
  seed-demo.ts   Demo campaign + player seed
```

---

## 9. Production build

```bash
pnpm build           # turbo: builds all apps + packages
pnpm --filter @promotionos/engine start   # runs apps/engine/dist/server.js
```

Studio and Canvas are Next.js — deploy them to Vercel/Render/Fly with `next build && next start`. Engine is a long-running Node process; deploy alongside Postgres + Redis.

---

## Need more detail?

The root [README.md](./README.md) has the full architecture diagram, mechanic-type reference, API surface, and template catalogue.
