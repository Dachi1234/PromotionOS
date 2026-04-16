# Contributing to PromotionOS

Practical extension guide. This is not a style guide — it's a map of which
files to touch for common changes and the invariants to preserve.

## Architecture at a glance

- **apps/engine** — Fastify HTTP + BullMQ workers. Port 3000.
- **apps/studio** — Next.js operator UI. Port 3001.
- **apps/canvas** — Next.js player-facing canvas. Port 3002.
- **packages/db** — Drizzle schema + migrations + typed exports
- **packages/zod-schemas** — request/response validation shared by engine and UIs
- **packages/types** — pure TypeScript types shared by everything

Workspace: pnpm + turbo. Node ≥ 20.

## Running locally

```
pnpm install
pnpm --filter @promotionos/db push          # apply migrations
pnpm seed                                    # seed mock players + admin user
pnpm --filter @promotionos/engine dev        # :3000
# optional — enable workers:
ENABLE_WORKERS=true pnpm --filter @promotionos/engine dev
pnpm --filter @promotionos/studio dev        # :3001
pnpm --filter @promotionos/canvas dev        # :3002
```

## Running tests

```
pnpm --filter @promotionos/engine test:run   # vitest unit tests
node test-mechanics.mjs                      # integration scripts (engine must be up)
node test-mechanics-extended.mjs
node test-player-session.mjs                 # real player-session harness
```

## Extension recipes

### Adding a new event type

1. **Schema**: add the enum value in `packages/zod-schemas/src/event.schemas.ts`
   (`eventTypeSchema`).
2. **DB**: extend the `event_type` Postgres enum in a new migration under
   `packages/db/migrations/`.
3. **Types**: nothing needed — `@promotionos/types/event.types` is derived
   from the Zod enum.
4. **Registry**: nothing needed — `metric-key.ts` regenerates automatically.
5. **Docs**: add a row to `docs/METRIC-KEYS.md` § "Event Types".
6. **Test**: no auto-coverage — add a fixture in `test-mechanics*.mjs` if
   the new type has a user-visible contract.

### Adding a new aggregation metric

1. Same as above but in `aggregation-rule.schema.ts`.
2. Update `PlayerCampaignStatsRepository` with the upsert method
   (`upsertCount` / `upsertSum` / `upsertAverage` currently exist).
3. Update `apps/engine/src/services/aggregation.service.ts` `switch` on
   `metric` to call the new upsert.
4. Extend `docs/METRIC-KEYS.md` § Metrics.

### Adding a new mechanic type

1. **DB**: add enum value to `mechanic_type` in a migration.
2. **Schema**: add the config Zod schema in `packages/zod-schemas/src/mechanic/`.
3. **Service**: create `apps/engine/src/services/mechanics/<name>.service.ts`.
4. **Public route**: wire into `apps/engine/src/routes/public/mechanic.routes.ts`
   if the player has interactive endpoints (spin / claim / submit).
5. **Auto-inject**: if the mechanic reads from a metric key, add the
   inference branch in
   `apps/engine/src/services/mechanics/aggregation-rule-inference.service.ts`.
6. **Editability**: add patch classifier in
   `apps/engine/src/modules/editability/editability.policy.ts` so operators
   can tweak config on a live campaign without having to pause.
7. **Integration test**: append a case to the matrix in
   `docs/INTEGRATION-TEST-RESULTS.md` and cover it in
   `test-mechanics-extended.mjs`.

### Adding a new reward type

1. **DB**: extend `reward_type` enum.
2. **Gateway**: add routing branch in
   `apps/engine/src/services/gateways/mock-reward-gateway.ts` (and any
   other gateway implementations). Terminal rewards go to the provider;
   stat-writing rewards write to `player_campaign_stats`.
3. **Outcome emission**: if the reward carries a scalar value, add it to
   `OUTCOME_EMITTING_REWARDS` in
   `apps/engine/src/workers/reward-executor.ts` so leaderboards that rank
   on `MECHANIC_OUTCOME_SUM` see it.
4. **Docs**: add a row to `docs/INTEGRATION-TEST-RESULTS.md`
   § "Reward Type → Mechanic Routing".

## Invariants to preserve

These are load-bearing properties — don't break them without updating every
consumer:

### windowStart parity (Phase 1.3)

`aggregation.service.ts` (writes stats) and `leaderboard.service.ts` /
`leaderboard-finalizer.ts` (read stats) must compute identical `windowStart`
for the same `(windowType, referenceTime)`. Always go through
`calculateWindowBounds`. Parity is pinned by
`src/services/__tests__/window-calculator.test.ts`.

### Soft-delete scoping (Phase 3.2)

`aggregation_rules.deleted_at` is a tombstone marker. Every query that
enumerates "live" rules — dedup checks, campaign duplication,
finalize/finalizer lookups — **must** filter `WHERE deleted_at IS NULL`.
The partial indexes in `packages/db/src/schema/promo-engine/aggregation.ts`
are defined with the same predicate; they won't match if the query forgets
the filter. Class-level JSDoc on `AggregationRuleRepository` documents the
invariant.

### Editability policy (Phase 1.4)

Do not inline status checks (`if (campaign.status === 'active') throw`).
Route every guarded mutation through
`apps/engine/src/modules/editability/editability.policy.ts`:

```ts
import { assertCanEdit } from '../editability/editability.policy'
assertCanEdit(campaign.status, { kind: 'tweak', actionId: 'mechanic.tweak' })
```

Then record via `recordEdit(...)` so the change shows up in
`campaign_audit_log`.

### Metric-key registry (Phase 3.1)

Never hand-code `['BET_SUM', 'DEPOSIT_SUM', ...]` lists. Import from
`@promotionos/types`. Adding an event type in Zod will automatically add
the matching keys everywhere.

### Rule-sync reconciliation (Phase 1.2)

When inference re-emits a rule set for a mechanic, use
`aggregation-rule-reconcile.service.ts` rather than naive delete-and-insert.
The three-way diff preserves `transformation` overrides on live rows and
uses soft-delete for removed keys.

## File conventions

- **Tests**: `src/**/__tests__/<subject>.test.ts` — vitest picks these up
  via `apps/engine/vitest.config.ts`.
- **Services**: thin classes with constructor DI. No direct Fastify access.
- **Repositories**: Drizzle-only. Always scope `deleted_at IS NULL` on tables
  that have tombstones.
- **Routes**: keep schema validation at the top, delegate to service, wrap
  errors with `handleError` / `handleRouteError` per the helpers in `lib/`.

## Commit hygiene

- One logical change per commit; phase-number or feature prefix welcome.
- Typecheck before pushing: `pnpm --filter @promotionos/engine typecheck`.
- If you touch editability, soft-delete, or windowStart: run the relevant
  `__tests__` suite — `pnpm --filter @promotionos/engine test:run`.
