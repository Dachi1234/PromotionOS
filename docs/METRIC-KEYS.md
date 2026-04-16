# Metric Keys

A **metric key** is the `{SOURCE}_{METRIC}` identifier that mechanics reference
when they want to read from `player_campaign_stats` — e.g. `BET_SUM`,
`LOGIN_COUNT`, `MECHANIC_OUTCOME_SUM`.

## Source of Truth

**Canonical module:** `packages/types/src/metric-key.ts` — re-exported from
`@promotionos/types`.

The registry is built programmatically from the cartesian product of two
Zod enums defined in `@promotionos/zod-schemas`:

- `eventTypeSchema.options` — the event types the ingestion API accepts
- `metricEnumSchema.options` — the aggregation metrics the pipeline supports

Any consumer (engine, studio UI, canvas, CLI) that needs to validate a
metric key **must** import from `@promotionos/types` rather than re-deriving
the list locally.

```ts
import {
  METRIC_KEYS,            // readonly sorted string[]
  METRIC_KEY_REGISTRY,    // ReadonlyMap<string, MetricKeyDescriptor>
  parseMetricKey,         // (key) => MetricKeyDescriptor | null
  isValidMetricKey,       // (key) => key is string
  EVENT_TYPES,            // readonly EventType[]
  METRICS,                // readonly Metric[]
} from '@promotionos/types'

if (!isValidMetricKey(input)) throw new Error('invalid metric key')
const { source, metric } = parseMetricKey(input)!
```

## Event Types (sources)

Defined in `packages/zod-schemas/src/event.schemas.ts`:

| Source | Emitted by | Typical payload |
|--------|-----------|-----------------|
| `BET` | Game platform integration | `{ amount, currency, gameId }` |
| `DEPOSIT` | Payments integration | `{ amount, currency, method }` |
| `REFERRAL` | Referral tracking | `{ referredPlayerId }` |
| `LOGIN` | Session service | `{}` |
| `OPT_IN` | Campaign opt-in flow | `{}` |
| `FREE_SPIN_USED` | Game provider | `{ gameId, count }` |
| `MANUAL` | Admin tools | Arbitrary |
| `MECHANIC_OUTCOME` | Engine (reward-executor) — **internal** | `{ amount, rewardType, sourceMechanicId }` |

`MECHANIC_OUTCOME` is a synthetic event emitted by the reward-executor
whenever it grants a reward whose type has a meaningful scalar value
(`VIRTUAL_COINS`, `CASH`, `CASHBACK`, `FREE_SPINS`, `FREE_BET`). This is the
Phase 3 ("MECHANIC_OUTCOME pipeline") propagation mechanism that lets one
mechanic feed another — e.g. a progress bar that grants 50 coins feeds a
leaderboard ranking on `MECHANIC_OUTCOME_SUM`.

## Metrics

Defined in `packages/zod-schemas/src/aggregation-rule.schema.ts`:

| Metric | Stat column written | Semantics |
|--------|---------------------|-----------|
| `COUNT` | `player_campaign_stats.count` | `+1` per matching event |
| `SUM` | `player_campaign_stats.sum_value` | `+payload[field]` per matching event |
| `AVERAGE` | `player_campaign_stats.sum_value` + `sample_count` | running mean |

## Auto-Injected Aggregation Rules

When a mechanic is created that references a metric key, the engine's
`aggregation-rule-inference.service.ts` is invoked to auto-inject the
matching `aggregation_rules` row (Phase 1.1). This means:

- Operators do not need to POST aggregation rules manually for the common cases
- The registry is the single source of truth for what's valid — if a mechanic
  references a key outside `METRIC_KEY_REGISTRY`, creation is rejected
- Re-implying the same rule is idempotent — an existing live row is preserved

See also: [CONTRIBUTING.md](./CONTRIBUTING.md) § "Adding a new event type".

## Full Registry (8 × 3 = 24)

```
BET_COUNT                    DEPOSIT_COUNT              REFERRAL_COUNT
BET_SUM                      DEPOSIT_SUM                REFERRAL_SUM
BET_AVERAGE                  DEPOSIT_AVERAGE            REFERRAL_AVERAGE
LOGIN_COUNT                  OPT_IN_COUNT               FREE_SPIN_USED_COUNT
LOGIN_SUM                    OPT_IN_SUM                 FREE_SPIN_USED_SUM
LOGIN_AVERAGE                OPT_IN_AVERAGE             FREE_SPIN_USED_AVERAGE
MANUAL_COUNT                 MECHANIC_OUTCOME_COUNT
MANUAL_SUM                   MECHANIC_OUTCOME_SUM
MANUAL_AVERAGE               MECHANIC_OUTCOME_AVERAGE
```

Some combinations are semantically meaningless (e.g. `LOGIN_SUM` — there's
no amount to sum) but the registry keeps the matrix complete; it's up to
the mechanic config schemas to reject meaningless pairings.
