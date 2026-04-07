# PromotionOS

**Open-source, full-stack promotion & gamification engine for online platforms.**

PromotionOS lets operators create, configure, and deploy interactive promotional campaigns — spin-the-wheel, leaderboards, missions, progress bars, cashouts, and more — through a no-code admin panel and a drag-and-drop page builder that renders as an embeddable iframe.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Monorepo Structure](#monorepo-structure)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone & Install](#1-clone--install)
  - [2. Start Infrastructure](#2-start-infrastructure)
  - [3. Configure Environment](#3-configure-environment)
  - [4. Run Database Migrations](#4-run-database-migrations)
  - [5. Seed Demo Data (optional)](#5-seed-demo-data-optional)
  - [6. Start Development Servers](#6-start-development-servers)
- [Environment Variables](#environment-variables)
- [Apps & Packages](#apps--packages)
  - [PromoEngine (Backend API)](#promoengine-backend-api)
  - [PromoStudio (Admin Panel)](#promostudio-admin-panel)
  - [PromoCanvas (Page Builder & Runtime)](#promocanvas-page-builder--runtime)
  - [Shared Packages](#shared-packages)
- [Database Schema](#database-schema)
- [API Overview](#api-overview)
- [Mechanic Types](#mechanic-types)
- [Visual Template Library](#visual-template-library)
- [Background Workers](#background-workers)
- [Deployment](#deployment)
- [License](#license)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Operator / Admin                        │
│                                                                 │
│   ┌─────────────────┐        ┌─────────────────────────────┐   │
│   │   PromoStudio   │        │       PromoCanvas           │   │
│   │  (Next.js 14)   │        │      (Next.js 14)           │   │
│   │   Port 3001     │        │       Port 3002             │   │
│   │                 │        │                             │   │
│   │ • Campaign      │  iframe│ • Builder Mode (admin)      │   │
│   │   Wizard (7     │◄──────►│   - Craft.js drag & drop    │   │
│   │   steps)        │        │   - Template picker         │   │
│   │ • Dashboard     │        │   - Theme customization     │   │
│   │ • Player mgmt   │        │                             │   │
│   │ • Event viewer  │        │ • Runtime Mode (player)     │   │
│   └────────┬────────┘        │   - Renders saved layout    │   │
│            │                 │   - Live data from engine   │   │
│            │ REST API        └──────────┬──────────────────┘   │
│            │                            │ REST API             │
│            ▼                            ▼                      │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    PromoEngine                          │  │
│   │                   (Fastify 5)                           │  │
│   │                    Port 3000                            │  │
│   │                                                         │  │
│   │  Admin API (/api/v1/admin/*)   Public API (/api/v1/*)  │  │
│   │  • Campaigns CRUD              • Player state           │  │
│   │  • Mechanics CRUD              • Spin / claim           │  │
│   │  • Rewards / Rules             • Leaderboards           │  │
│   │  • Canvas config               • Missions              │  │
│   │  • Audit logs                  • Opt-in                 │  │
│   │                                                         │  │
│   │  Background Workers (BullMQ)                            │  │
│   │  • Event ingestor              • Campaign scheduler     │  │
│   │  • Aggregation processor       • Leaderboard refresh    │  │
│   │  • Mechanic evaluator          • Reward executor        │  │
│   │  • Window recalculator         • Condition expiry       │  │
│   └────────┬─────────────────────────────┬──────────────────┘  │
│            │                             │                     │
│     ┌──────▼──────┐              ┌───────▼───────┐             │
│     │ PostgreSQL  │              │     Redis     │             │
│     │   (16+)     │              │    (7+)       │             │
│     │             │              │               │             │
│     │ Drizzle ORM │              │ BullMQ queues │             │
│     │ Migrations  │              │ Leaderboard   │             │
│     └─────────────┘              │   cache       │             │
│                                  └───────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
PromotionOS/
├── apps/
│   ├── engine/          # Fastify 5 backend API + background workers
│   ├── studio/          # Next.js 14 admin panel (no-code wizard)
│   └── canvas/          # Next.js 14 page builder + player runtime
├── packages/
│   ├── db/              # Drizzle ORM schema, migrations, seed
│   ├── types/           # Shared TypeScript types
│   └── zod-schemas/     # Shared Zod validation schemas
├── scripts/
│   └── seed-demo.ts     # Demo data seeder
├── docker-compose.yml   # PostgreSQL + Redis
├── turbo.json           # Turborepo task config
├── pnpm-workspace.yaml  # pnpm workspace definition
└── .env.example         # Environment template
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js ≥ 20 |
| **Package Manager** | pnpm ≥ 9 |
| **Monorepo** | Turborepo |
| **Backend** | Fastify 5, TypeScript |
| **Database** | PostgreSQL 16 (Drizzle ORM) |
| **Queue / Cache** | Redis 7 (BullMQ, ioredis) |
| **Admin Frontend** | Next.js 14, React 18, Tailwind CSS, shadcn/ui patterns |
| **Page Builder** | Next.js 14, Craft.js, Framer Motion |
| **Validation** | Zod |
| **State Management** | Zustand (client), TanStack Query (server) |
| **Auth** | JWT (admin), session tokens (player) |
| **Containerization** | Docker, Docker Compose |

---

## Features

### Campaign Management
- 7-step wizard: Basics → Targeting → Mechanics → Triggers → Rewards → Page Builder → Review & Publish
- Campaign lifecycle: `draft` → `scheduled` → `active` → `paused` → `ended` → `archived`
- Auto-schedule campaigns based on start date
- Duplicate campaigns with all mechanics and rewards
- CSV player targeting alongside dynamic segments

### Mechanic Types (8 types)
- **Spin-the-Wheel** — configurable slices, probability weights, spin limits
- **Wheel-in-Wheel** — nested wheel mechanic
- **Leaderboard** — real-time scoring with Redis caching
- **Layered Leaderboard** — multi-tier leaderboard
- **Mission / Challenges** — multi-step achievement system
- **Progress Bar** — visual progress toward a goal
- **Cashout** — claim accumulated rewards
- **Tournament** — competition bracket format

### Visual Template Library
- 3 professionally designed templates per mechanic (Classic, Modern, Neon)
- 24 total template components with GPU-accelerated animations
- `prefers-reduced-motion` accessibility support
- Template picker in the builder settings panel
- Per-template color and style customization

### Page Builder (PromoCanvas)
- Drag-and-drop Craft.js editor
- Layout blocks: Hero, Rich Text, Image, Button, Columns, Spacer/Divider, Countdown Timer
- Mechanic widget blocks with live data binding
- Global theme panel (colors, fonts, backgrounds)
- Device preview (desktop / tablet / mobile)
- Undo / redo support
- Auto-save with postMessage bridge to Studio

### Admin Panel (PromoStudio)
- Full campaign CRUD with search and status filtering
- Player management and event viewer
- Custom date/time picker with quick presets
- Comprehensive tooltips and field descriptions for business users
- Inline canvas preview with embed code generation
- "Preview as Player" mode for any campaign status

### Engine (Backend)
- RESTful Admin API and Public Player API
- Event ingestion pipeline with aggregation rules
- Trigger matching and mechanic evaluation
- Reward execution with pluggable gateway (mock included)
- Eligibility and condition evaluation
- Audit logging for all admin actions
- Rate limiting, CORS, JWT authentication
- Background workers for async processing

---

## Prerequisites

| Requirement | Version |
|------------|---------|
| **Node.js** | ≥ 20.0.0 |
| **pnpm** | ≥ 9.0.0 |
| **Docker & Docker Compose** | Latest (for PostgreSQL & Redis) |
| **Git** | Latest |

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/Dachi1234/PromotionOS.git
cd PromotionOS
pnpm install
```

### 2. Start Infrastructure

Start PostgreSQL and Redis using Docker Compose:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432` (user: `postgres`, password: `postgres`, db: `promotionos`)
- **Redis 7** on port `6379`

### 3. Configure Environment

Copy the example environment file and adjust if needed:

```bash
cp .env.example .env
```

For local development, the defaults work out of the box with Docker Compose.

The engine reads from the root `.env`. Studio and Canvas each have their own `.env.local`:

**`apps/studio/.env.local`:**
```env
NEXT_PUBLIC_ENGINE_URL=http://localhost:3000
NEXT_PUBLIC_CANVAS_URL=http://localhost:3002
```

**`apps/canvas/.env.local`:**
```env
NEXT_PUBLIC_ENGINE_URL=http://localhost:3000
ALLOWED_FRAME_ANCESTORS=*
```

### 4. Run Database Migrations

```bash
cd packages/db
pnpm generate
pnpm migrate
cd ../..
```

### 5. Seed Demo Data (optional)

First, start the engine (see step 6), then in a separate terminal:

```bash
pnpm seed
```

This creates a demo admin user (`admin / admin123`), sample campaigns with mechanics, rewards, and player data.

### 6. Start Development Servers

From the repository root:

```bash
pnpm dev
```

This starts all three apps via Turborepo:

| App | URL | Description |
|-----|-----|-------------|
| **Engine** | http://localhost:3000 | Backend API + workers |
| **Studio** | http://localhost:3001 | Admin panel |
| **Canvas** | http://localhost:3002 | Page builder & player runtime |

Or start them individually:

```bash
# Terminal 1 — Engine
cd apps/engine && pnpm dev

# Terminal 2 — Studio
cd apps/studio && pnpm dev

# Terminal 3 — Canvas
cd apps/canvas && pnpm dev
```

### First Login

Navigate to http://localhost:3001/login and sign in with:
- **Username:** `admin`
- **Password:** `admin123`

(These credentials are created by the seed script.)

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/promotionos` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | `dev-secret-change-in-production` | Secret for signing admin JWTs |
| `PORT` | `3000` | Engine server port |
| `ENABLE_WORKERS` | `true` | Enable background job workers |
| `PLAYER_CONTEXT_PROVIDER` | `mock` | Player context adapter (`mock` for dev) |
| `REWARD_GATEWAY` | `mock` | Reward fulfillment adapter (`mock` for dev) |
| `ALLOWED_ORIGINS` | `http://localhost:3001,http://localhost:3002` | CORS allowed origins |
| `NEXT_PUBLIC_ENGINE_URL` | `http://localhost:3000` | Engine URL for frontends |
| `NEXT_PUBLIC_CANVAS_URL` | `http://localhost:3002` | Canvas URL for Studio iframe |
| `ALLOWED_FRAME_ANCESTORS` | `*` | CSP frame-ancestors for Canvas |

---

## Apps & Packages

### PromoEngine (Backend API)

**Location:** `apps/engine/`

Fastify 5 server providing:
- **Admin API** (`/api/v1/admin/*`) — campaign CRUD, mechanics, rewards, aggregation rules, canvas config, wizard drafts, audit logs, segment preview
- **Public API** (`/api/v1/*`) — player state, spin, leaderboard, missions, opt-in, reward claiming, canvas config
- **Health check** — `GET /health` and `GET /api/v1/health`
- **Background Workers** — BullMQ-based async processing (event ingestion, aggregation, mechanic evaluation, reward execution, campaign scheduling, leaderboard refresh)

#### Key Dependencies

| Package | Purpose |
|---------|---------|
| `fastify` ^5.2.1 | HTTP framework |
| `@fastify/cors` ^10.0.1 | Cross-origin resource sharing |
| `@fastify/jwt` ^9.0.1 | JWT authentication |
| `@fastify/rate-limit` ^10.3.0 | Request rate limiting |
| `@fastify/swagger` ^9.7.0 | OpenAPI spec generation |
| `@fastify/swagger-ui` ^5.2.5 | Swagger UI |
| `drizzle-orm` ^0.39.1 | Type-safe SQL ORM |
| `postgres` ^3.4.5 | PostgreSQL driver |
| `bullmq` ^5.34.9 | Job queue (Redis-backed) |
| `ioredis` ^5.4.2 | Redis client |
| `zod` ^3.24.1 | Runtime validation |
| `dotenv` ^16.4.7 | Environment variable loading |

---

### PromoStudio (Admin Panel)

**Location:** `apps/studio/`

Next.js 14 App Router application providing a comprehensive admin interface.

#### Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` 14.2.35 | React framework |
| `react` / `react-dom` ^18 | UI library |
| `@tanstack/react-query` ^5.96.2 | Server state management |
| `@tanstack/react-table` ^8.21.3 | Data table rendering |
| `zustand` ^5.0.12 | Client state management |
| `@radix-ui/*` | Accessible UI primitives (dialog, dropdown, popover, tabs, tooltip, etc.) |
| `@dnd-kit/*` | Drag-and-drop mechanics ordering |
| `react-hook-form` ^7.72.1 | Form management |
| `@hookform/resolvers` ^5.2.2 | Zod form validation |
| `react-day-picker` ^9.14.0 | Custom date picker calendar |
| `date-fns` ^4.1.0 | Date utility functions |
| `reactflow` ^11.11.4 | Dependency graph visualization |
| `lucide-react` ^1.7.0 | Icon library |
| `class-variance-authority` ^0.7.1 | Variant-based styling |
| `clsx` / `tailwind-merge` | Conditional class composition |
| `zod` ^3.24.1 | Runtime validation |
| `tailwindcss` ^3.4.1 | Utility-first CSS |

---

### PromoCanvas (Page Builder & Runtime)

**Location:** `apps/canvas/`

Next.js 14 application with two modes:
- **Builder Mode** (`/builder/[campaignId]`) — Craft.js-powered drag-and-drop editor for composing promotion pages
- **Runtime Mode** (`/[slug]`) — renders the saved canvas layout with live data from the engine

#### Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` 14.2.35 | React framework |
| `react` / `react-dom` ^18 | UI library |
| `@craftjs/core` ^0.2.12 | Visual page builder framework |
| `@tanstack/react-query` ^5.96.2 | Server state management |
| `framer-motion` ^12.38.0 | Animation library |
| `zustand` ^5.0.12 | Client state management |
| `lucide-react` ^1.7.0 | Icon library |
| `class-variance-authority` ^0.7.1 | Variant-based styling |
| `clsx` / `tailwind-merge` | Conditional class composition |
| `tailwindcss` ^3.4.1 | Utility-first CSS |

---

### Shared Packages

#### `@promotionos/db`

Drizzle ORM schema definitions, migration files, and seed scripts.

| Package | Purpose |
|---------|---------|
| `drizzle-orm` ^0.39.1 | ORM |
| `postgres` ^3.4.5 | PostgreSQL driver |
| `drizzle-kit` ^0.30.4 | Migration tooling |

#### `@promotionos/zod-schemas`

Shared Zod validation schemas for all mechanic configs, campaign operations, events, and API payloads.

#### `@promotionos/types`

Shared TypeScript type definitions derived from the Zod schemas.

---

## Database Schema

The PostgreSQL database contains the following table groups:

### PromoEngine Tables
| Table | Purpose |
|-------|---------|
| `campaigns` | Campaign definitions (name, slug, dates, status, canvas config) |
| `mechanics` | Mechanic instances bound to campaigns (type, config, display order) |
| `reward_definitions` | Prize definitions per mechanic (type, probability weight) |
| `aggregation_rules` | Event aggregation configurations (source type, metric, window) |
| `raw_events` | Ingested player events |
| `players` | Player profiles |
| `player_mechanic_states` | Per-player mechanic progress state |
| `player_rewards` | Awarded player rewards |
| `campaign_optins` | Player campaign opt-in records |

### PromoStudio Tables
| Table | Purpose |
|-------|---------|
| `admin_users` | Admin user accounts (bcrypt passwords) |
| `wizard_drafts` | Auto-saved campaign wizard drafts |
| `audit_logs` | Admin action audit trail |

---

## API Overview

### Admin Endpoints (require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/auth/login` | Admin login |
| `GET` | `/api/v1/admin/campaigns` | List campaigns |
| `POST` | `/api/v1/admin/campaigns` | Create campaign |
| `GET` | `/api/v1/admin/campaigns/:id` | Get campaign with details |
| `PATCH` | `/api/v1/admin/campaigns/:id` | Update campaign |
| `PATCH` | `/api/v1/admin/campaigns/:id/status` | Transition campaign status |
| `DELETE` | `/api/v1/admin/campaigns/:id` | Delete campaign |
| `POST` | `/api/v1/admin/campaigns/:id/duplicate` | Duplicate campaign |
| `POST` | `/api/v1/admin/campaigns/:id/mechanics` | Add mechanic |
| `GET` | `/api/v1/admin/campaigns/:id/mechanics` | List mechanics |
| `PUT` | `/api/v1/admin/mechanics/:id` | Update mechanic |
| `DELETE` | `/api/v1/admin/mechanics/:id` | Delete mechanic |
| `POST` | `/api/v1/admin/mechanics/:id/reward-definitions` | Add reward |
| `PUT` | `/api/v1/admin/reward-definitions/:id` | Update reward |
| `DELETE` | `/api/v1/admin/reward-definitions/:id` | Delete reward |
| `POST` | `/api/v1/admin/campaigns/:id/aggregation-rules` | Add aggregation rule |
| `PUT` | `/api/v1/admin/campaigns/:id/canvas-config` | Save canvas layout |
| `GET` | `/api/v1/admin/campaigns/:id/canvas-config` | Get canvas layout |
| `POST/GET` | `/api/v1/admin/wizard-drafts` | Save/list wizard drafts |

### Public Endpoints (require session token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/campaigns/:slug` | Get campaign by slug |
| `GET` | `/api/v1/campaigns/:slug/canvas` | Get canvas config |
| `GET` | `/api/v1/campaigns/:slug/player-state` | Get player state |
| `POST` | `/api/v1/campaigns/:slug/opt-in` | Player opt-in |
| `POST` | `/api/v1/mechanics/:id/spin` | Spin the wheel |
| `GET` | `/api/v1/mechanics/:id/leaderboard` | Get leaderboard |
| `GET` | `/api/v1/mechanics/:id/missions` | Get mission state |
| `POST` | `/api/v1/rewards/:id/claim` | Claim reward |
| `POST` | `/api/v1/events` | Ingest player event |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/health` | Health check (versioned) |

---

## Mechanic Types

| Type | Key | Description |
|------|-----|-------------|
| Spin-the-Wheel | `WHEEL` | Configurable prize wheel with weighted probability slices |
| Wheel-in-Wheel | `WHEEL_IN_WHEEL` | Nested wheel for multi-tier prizes |
| Leaderboard | `LEADERBOARD` | Real-time player ranking with Redis-cached scores |
| Layered Leaderboard | `LEADERBOARD_LAYERED` | Multi-tier leaderboard with rank-based rewards |
| Mission | `MISSION` | Multi-step challenge system with progress tracking |
| Progress Bar | `PROGRESS_BAR` | Visual progress toward configurable thresholds |
| Cashout | `CASHOUT` | Accumulated balance withdrawal mechanic |
| Tournament | `TOURNAMENT` | Competition bracket format |

---

## Visual Template Library

Each mechanic widget ships with **3 visual templates** (24 components total):

| Mechanic | Classic | Modern | Neon |
|----------|---------|--------|------|
| Wheel | `classic-wheel` | `modern-wheel` | `neon-wheel` |
| Leaderboard | `podium-leaderboard` | `card-stack-leaderboard` | `neon-scoreboard` |
| Mission | `quest-map` | `checklist-cards` | `neon-progress-track` |
| Progress Bar | `treasure-fill` | `clean-linear-bar` | `neon-power-meter` |
| Cashout | `vault-door` | `clean-claim-card` | `neon-unlock` |
| Reward History | `trophy-case` | `clean-list` | `neon-collection` |
| Opt-In | `classic-cta` | `clean-pill` | `neon-pulse` |
| Countdown | `flip-clock` | `clean-digits` | `neon-countdown` |

Templates are purely presentational — they receive data props from the widget container and render accordingly. Template selection and customization (accent color, text color, background) are available in the Canvas builder settings panel.

---

## Background Workers

The engine runs BullMQ workers for async processing:

| Worker | Description |
|--------|-------------|
| `event-ingestor` | Processes raw player events from the ingestion queue |
| `aggregation-processor` | Runs aggregation rules against events |
| `mechanic-evaluation-worker` | Evaluates mechanic triggers and conditions |
| `mechanic-execution-worker` | Executes mechanic actions (spins, reward grants) |
| `reward-executor` | Fulfills rewards through the gateway |
| `campaign-scheduler` | Auto-activates scheduled campaigns at start time |
| `leaderboard-refresher` | Periodic leaderboard recalculation |
| `leaderboard-finalizer` | Finalizes leaderboards at campaign end |
| `window-recalculator` | Recomputes time-windowed aggregations |
| `condition-expiry-checker` | Expires stale conditional progress |

---

## Deployment

### Docker (Engine only)

```bash
docker build -f apps/engine/Dockerfile -t promotionos-engine .
docker run -p 3000:3000 --env-file .env promotionos-engine
```

### Full Stack with Docker Compose

The included `docker-compose.yml` provides PostgreSQL and Redis. The application services (Engine, Studio, Canvas) can be added as additional services or deployed separately.

### Production Recommendations

- Use a managed PostgreSQL (e.g., Neon, Supabase, AWS RDS)
- Use a managed Redis (e.g., Upstash, AWS ElastiCache)
- Set `NODE_ENV=production` and a strong `JWT_SECRET`
- Deploy Studio and Canvas as static builds on Vercel / Netlify / Cloudflare Pages
- Deploy Engine as a Docker container or Node.js process
- Configure `ALLOWED_ORIGINS` to match your production domains
- Set `ALLOWED_FRAME_ANCESTORS` to restrict iframe embedding

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps |
| `pnpm seed` | Seed demo data (engine must be running) |
| `pnpm --filter @promotionos/db generate` | Generate new Drizzle migration |
| `pnpm --filter @promotionos/db migrate` | Run database migrations |
| `pnpm --filter @promotionos/db studio` | Open Drizzle Studio (DB browser) |

---

## License

This project is provided as-is for educational and demonstration purposes.
