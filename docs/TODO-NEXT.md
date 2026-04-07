# PromotionOS — Next Session Tasks

## Bug Fix: Mechanics Not Saving to Engine

**Priority: Critical**

When you publish a campaign from the Studio wizard, mechanics are configured in the client-side Zustand store but **never reach the engine database**. The campaign is saved with 0 mechanics.

### Root Cause

`syncMechanicsToEngine()` in `apps/studio/components/wizard/wizard-shell.tsx` sends mechanic configs to the engine API, but the engine's Zod validation rejects them because:

1. **Key naming mismatch** — The wizard stores config in camelCase (`spinTrigger`, `maxSpinsPerDay`), but the engine schemas expect snake_case (`spin_trigger`, `max_spins_per_day`).
2. **Missing defaults** — When a user adds a mechanic without opening the config drawer, `config` is `{}`. The engine schemas have required fields (e.g., `spin_trigger` for WHEEL is mandatory).
3. **Silent failure** — Errors are caught with `console.error` and swallowed, so the user sees no feedback.

### Fix Required

In `syncMechanicsToEngine()`, add a config transformer per mechanic type that:
- Maps camelCase wizard keys → snake_case engine keys
- Provides sensible defaults for required fields when not configured
- Shows a user-facing error if sync fails

#### Schema requirements per mechanic type:

| Type | Required Fields (snake_case) |
|------|------------------------------|
| `WHEEL` | `spin_trigger` (enum: `manual` \| `automatic`) |
| `WHEEL_IN_WHEEL` | same as WHEEL |
| `LEADERBOARD` | `ranking_metric`, `window_type` (enum: `daily` \| `weekly` \| `campaign`), `tie_breaking` (enum: `first_to_reach` \| `highest_secondary` \| `split`), `prize_distribution` (array) |
| `LEADERBOARD_LAYERED` | same as LEADERBOARD |
| `MISSION` | `execution_mode` (enum: `sequential` \| `parallel`), `steps` (array, min 1, each with `step_id`, `order`, `title`, `metric_type`, `target_value`, `time_limit_hours`, `reward_definition_id`) |
| `PROGRESS_BAR` | `metric_type`, `target_value`, `reward_definition_id` |
| `CASHOUT` | `claim_conditions` (condition tree), `reward_definition_id`, `max_claims_per_player` |

#### Files to modify:
- `apps/studio/components/wizard/wizard-shell.tsx` — transform config before sending
- `apps/studio/components/wizard/step-3-mechanics.tsx` — set default config when adding mechanic (not empty `{}`)

---

## Feature: Wire Engine Data → Visual Templates

**Priority: High**

Currently, Canvas mechanic widgets render placeholder/demo data. They should display actual configured data from the engine.

### What needs wiring:

#### Wheel (`apps/canvas/components/widgets/wheel-widget.tsx`)
- Read `reward_definitions` from the engine API for this mechanic
- Each reward definition = one wheel slice
- Map: `reward.config.label` → slice label, `reward.probabilityWeight` → slice size, generate colors from config or defaults
- Pass as `slices` prop to the wheel template

#### Leaderboard (`apps/canvas/components/widgets/leaderboard-widget.tsx`)
- Already fetches leaderboard data via `useLeaderboard(mechanicId)`
- Wire: entries → template `entries` prop, player rank → `highlightedRank`
- Map `prize_distribution` from mechanic config to show prize info per rank

#### Mission (`apps/canvas/components/widgets/mission-widget.tsx`)
- Already fetches mission state via `useMissionState(mechanicId)`
- Wire: `steps` from API → template `steps` prop (title, progress, status)
- Map step completion % from `current_value / target_value`

#### Progress Bar (`apps/canvas/components/widgets/progress-bar-widget.tsx`)
- Needs player state from `usePlayerState`
- Wire: current accumulated value → `current`, mechanic config `target_value` → `target`
- Calculate percentage for the template

#### Cashout (`apps/canvas/components/widgets/reward-history-widget.tsx`)
- Show claimed rewards from player state
- Wire: reward history list → template entries

### Architecture reminder:

```
Engine DB                 Canvas Widget              Template Component
┌──────────────┐         ┌──────────────────┐       ┌──────────────────┐
│ mechanic     │  API    │ WheelWidget      │ props │ NeonWheel        │
│  .config     │────────►│  fetches data    │──────►│  renders slices  │
│  .rewards[]  │         │  transforms it   │       │  handles anims   │
└──────────────┘         └──────────────────┘       └──────────────────┘
```

The widget is the bridge — it owns the API calls and data transformation. The template is purely presentational.

### Files to modify:
- `apps/canvas/components/widgets/wheel-widget.tsx`
- `apps/canvas/components/widgets/leaderboard-widget.tsx`
- `apps/canvas/components/widgets/mission-widget.tsx`
- `apps/canvas/components/widgets/progress-bar-widget.tsx`
- `apps/canvas/components/widgets/reward-history-widget.tsx`
- `apps/canvas/components/widgets/optin-button-widget.tsx`
- `apps/canvas/hooks/use-canvas-data.ts` — may need new hooks like `useMechanicRewards(mechanicId)`

---

## After Fixing

- Run `npx tsc --noEmit` on all three apps (engine, studio, canvas)
- Test: create campaign → add WHEEL mechanic → configure → add rewards in Step 5 → publish → view detail page → verify mechanics show up
- Test: open Canvas preview → verify wheel shows configured slices
- Push to GitHub
