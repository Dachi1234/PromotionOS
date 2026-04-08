# PromotionOS — Development Log

This document tracks all significant changes, bug fixes, architectural decisions, and feature implementations across the project.

---

## Session 1: Initial Build

**Scope:** Full-stack monorepo scaffold with all core features.

### Delivered
- Monorepo setup (Turborepo + pnpm workspaces)
- **PromoEngine** — Fastify 5 backend with 8 mechanic types, event pipeline, reward system, BullMQ workers
- **PromoStudio** — Next.js 14 admin panel with 7-step campaign wizard
- **PromoCanvas** — Next.js 14 page builder (Craft.js) with 24 visual templates
- **Shared packages** — `@promotionos/db` (Drizzle ORM), `@promotionos/types`, `@promotionos/zod-schemas`
- Docker Compose for PostgreSQL 16 + Redis 7
- Database schema, migrations, and seed scripts
- Admin JWT auth + player session token auth

---

## Session 2: Core Bug Fixes & Pipeline Enhancements

**Scope:** Admin login, preview mode, event pipeline optimization, builder data bridge.

### Changes

1. **Admin preview bypass** — Preview-as-player mode (`?preview=admin`) now bypasses session auth on public campaign routes, allowing admins to preview campaigns in any status.

2. **Hybrid event pipeline** — Events are now processed synchronously for immediate UI feedback, with Redis-backed async aggregation for heavy computation. Optimized Redis connection pooling.

3. **Builder-engine data bridge** — Canvas builder page now loads mechanic configs from the engine API, not just reward definitions. PostMessage bridge between Studio ↔ Canvas passes full mechanic data.

4. **Player testing overhaul** — Test toolbar in Canvas runtime shows event presets, opt-in button, custom event firing, and leaderboard finalization.

5. **Craft.js resolver fix** — Block library and resolver were out of sync causing drag-and-drop to fail silently. Unified both to use the same component references with error boundary wrappers.

---

## Session 3: Metric Dropdowns, Mission Fixes, Cross-Mechanic Data Flow

**Scope:** UX improvements, mission bug fixes, MECHANIC_OUTCOME architecture for cross-mechanic data flow.

### 1. Metric Type Dropdowns (All Mechanics)

**Problem:** Metric fields across all mechanic configs (mission steps, progress bar, leaderboard ranking/tiebreaker) were plain text inputs. Users had to guess valid metric keys like `BET_COUNT` or `DEPOSIT_SUM`.

**Solution:** Created a shared metric options library and replaced all text inputs with dropdowns.

**Files changed:**
- `apps/studio/lib/metric-options.ts` — **NEW** shared constants and `buildMetricOptions()` function
- `apps/studio/components/wizard/configs/mission-config.tsx` — text input → dropdown
- `apps/studio/components/wizard/configs/progress-bar-config.tsx` — text input → dropdown
- `apps/studio/components/wizard/configs/leaderboard-config.tsx` — ranking metric + tiebreaker → dropdowns

**Metric format:** `{EVENT_TYPE}_{METRIC}` (e.g., `BET_COUNT`, `DEPOSIT_SUM`, `MECHANIC_OUTCOME_SUM`)

**Supported event types:** `BET`, `DEPOSIT`, `REFERRAL`, `LOGIN`, `OPT_IN`, `FREE_SPIN_USED`, `MANUAL`, `MECHANIC_OUTCOME`

**Supported metrics:** `COUNT`, `SUM`, `AVERAGE`

**Behavior:** When aggregation rules exist on the mechanic → dropdown shows only those configured combinations (more specific). When no rules exist → shows all possible combinations as fallback.

### 2. Mission Widget Builder Fix

**Problem:** Mission widget showed only 1 step in the Canvas builder preview even when the mechanic had 2 steps configured.

**Root cause:** The widget was reading `builderMech.rewards` to generate preview steps. But mission steps are defined in `mechanic.config.steps`, not in reward definitions. Rewards are *per step*, not the steps themselves.

**Solution:**
- Updated Canvas builder page to load mechanic `config` into the builder store (was only loading `id`, `type`, `label`, and `rewards`)
- Made `config` a required field on `BuilderMechanic` interface
- Rewrote mission widget to read from `builderMech.config.steps` in builder mode

**Files changed:**
- `apps/canvas/stores/canvas-store.ts` — `config` field now required on `BuilderMechanic`
- `apps/canvas/app/builder/[campaignId]/page.tsx` — loads mechanic config from API + postMessage
- `apps/canvas/components/widgets/mission-widget.tsx` — reads config.steps for builder preview

**Builder preview now shows:**
- Step title from config
- Description as `{metric_type} ≥ {target_value}`
- First step as "active", rest as "locked"
- Falls back to sample steps if no config available

### 3. MECHANIC_OUTCOME Events (Cross-Mechanic Data Flow)

**Problem:** Leaderboards couldn't rank players by progress bar outcomes (e.g., virtual coins earned). There was no way for one mechanic's rewards to feed into another mechanic's scoring.

**Architecture decision:** Evaluated 3 approaches:

| Approach | Description | Verdict |
|----------|-------------|---------|
| **1. Direct Propagation** | Reward service writes directly to leaderboard stats | Rejected — tightly coupled, fragile |
| **2. Shared Aggregation** | Both mechanics independently aggregate the same raw events | Rejected — doesn't capture reward outcomes, only raw events |
| **3. MECHANIC_OUTCOME Events** | Reward executor emits internal events that flow through the normal aggregation pipeline | **Chosen** — clean, extensible, leverages existing infrastructure |

**How it works:**

```
Player bets → BET event → Aggregation → Progress Bar fills
                                              ↓
                                    Progress Bar complete
                                              ↓
                                    VIRTUAL_COINS reward granted
                                              ↓
                                    Reward Executor emits MECHANIC_OUTCOME
                                    { amount: 10, rewardType: "VIRTUAL_COINS", sourceMechanicId: "..." }
                                              ↓
                                    Aggregation pipeline picks it up
                                              ↓
                                    Leaderboard's MECHANIC_OUTCOME_SUM stat updated
                                              ↓
                                    Player ranked on leaderboard by coin total
```

**Implementation:**

- `apps/engine/src/workers/reward-executor.ts` — **REWRITTEN**
  - New `OUTCOME_EMITTING_REWARDS` map defines which reward types emit events and how to extract amounts:
    - `VIRTUAL_COINS` → `config.coins ?? config.amount ?? 1`
    - `CASH` → `config.amount ?? 0`
    - `CASHBACK` → `config.amount ?? 0`
    - `FREE_SPINS` → `config.count ?? config.spins ?? 1`
    - `FREE_BET` → `config.amount ?? 0`
  - New `emitMechanicOutcome()` function:
    1. Finds all aggregation rules in the campaign with `sourceEventType: 'MECHANIC_OUTCOME'`
    2. Processes each rule through the aggregation service
    3. Writes stats to the mechanic that owns the rule (e.g., the leaderboard)
  - Worker now calls `emitMechanicOutcome()` after every successful reward execution

- `apps/engine/src/services/reward-execution.service.ts` — **CLEANED UP**
  - Removed hacky direct-propagation code from earlier attempt
  - VIRTUAL_COINS case writes to source mechanic only (for its own tracking)
  - Cross-mechanic propagation delegated entirely to MECHANIC_OUTCOME events

- `apps/studio/lib/metric-options.ts` — Added `MECHANIC_OUTCOME_COUNT` and `MECHANIC_OUTCOME_SUM` to dropdown options

- `packages/db/src/schema/promo-engine/events.ts` — `MECHANIC_OUTCOME` was already in the `eventTypeEnum`

**Setup in Studio (example: Progress Bar → Leaderboard):**
1. Progress Bar mechanic: aggregation rule = `BET → SUM → campaign`, reward = `VIRTUAL_COINS` (10 coins)
2. Leaderboard mechanic: aggregation rule = `MECHANIC_OUTCOME → SUM → campaign`, ranking metric = `MECHANIC_OUTCOME_SUM`

### 4. CORS Fix

**Problem:** Canvas test toolbar (port 3002) making fetch requests to Engine (port 3000) was blocked by CORS.

**Solution:**
- Set `ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3002` in engine `.env`
- Added explicit `methods` and `allowedHeaders` to CORS config in `app.ts`:
  - Methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
  - Headers: `Content-Type, Authorization, x-session-token`

**Files changed:**
- `apps/engine/.env` — added `ALLOWED_ORIGINS`
- `apps/engine/src/app.ts` — explicit CORS methods and headers

### 5. Time Travel Testing

**Delivered in previous session, documented here for completeness.**

The Canvas test toolbar includes a time-travel feature for testing daily/weekly mechanics without waiting:

- Toggle "Time Travel" mode
- Pick a custom date/time or use presets (Yesterday, Last Week, Tomorrow, Now)
- All events fired while time travel is active use the simulated `occurredAt` timestamp
- Leaderboard finalization can target a specific window date

**File:** `apps/canvas/components/testing/test-toolbar.tsx`

---

## Architectural Concepts

### Aggregation Pipeline

```
Raw Event (BET, DEPOSIT, etc.)
    ↓
Trigger Matcher — finds matching trigger rules
    ↓
Aggregation Rules — each rule defines:
  • sourceEventType (what events to count)
  • metric (COUNT, SUM, AVERAGE)
  • windowType (daily, weekly, campaign)
  • mechanicId (which mechanic gets the stat)
    ↓
player_campaign_stats — stores aggregated values
  • Key format: {sourceEventType}_{metric} (e.g., BET_COUNT, DEPOSIT_SUM)
  • Scoped by: playerId + campaignId + mechanicId + windowType + windowStart
    ↓
Mechanic Evaluation — mechanics read their stats and act:
  • Progress Bar: current value vs target → auto-grant reward
  • Leaderboard: rank by stat value → display rankings
  • Mission: check step completion → advance to next step
```

### Reward Execution Flow

```
Mechanic grants reward → player_rewards (status: pending)
    ↓
BullMQ queue: REWARD_EXECUTION
    ↓
Reward Executor Worker:
  1. Route to gateway (mock or external)
  2. Update execution record (success/failed)
  3. Update player_reward status (fulfilled/failed)
  4. EXTRA_SPIN → write bonus_spins to target mechanic
  5. OUTCOME_EMITTING reward → emit MECHANIC_OUTCOME event
```

### Canvas Architecture (Builder ↔ Runtime)

```
Studio (port 3001)
  ↓ iframe with JWT
Canvas Builder (port 3002/builder/[campaignId])
  ↓ Craft.js serialize → JSON
Engine API: PUT /canvas-config
  ↓
Canvas Runtime (port 3002/[slug])
  ↓ Craft.js deserialize
Renders saved layout with live data from engine
```

### Mechanic Dependencies

Mechanics can have unlock conditions:
```
WHEEL (primary) → LEADERBOARD (unlocked when wheel spun 5x)
                → MISSION (unlocked when leaderboard rank ≤ 10)
```

The dependency graph is visualized in Studio using ReactFlow.

---

## Known Issues & Next Steps

### Critical: Mechanics Not Syncing to Engine
- Client-side Zustand store uses camelCase keys, engine expects snake_case
- Empty `config: {}` when user adds mechanic without opening config drawer
- Silent API failures — no user-facing error messages
- **Impact:** Campaigns save with 0 mechanics
- **Fix:** Add config transformer in `syncMechanicsToEngine()` with per-type defaults

### High: Template Data Wiring Gaps
- Some widgets still show placeholder data instead of engine data
- Wheel widget needs to map reward definitions to slices
- Cashout and reward history widgets need player reward data
- **Fix:** Complete data transformation in each widget component

### Medium: Canvas Visual Overhaul
- Builder UI could use better styling and UX polish
- Mobile preview mode needs testing
- Block settings panels need clearer labels

See `docs/TODO-NEXT.md` for detailed fix instructions.
