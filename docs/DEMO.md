# PromotionOS — Demo Walkthrough

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for local PostgreSQL and Redis)

## Quick Start

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on port 5432 and Redis on port 6379.

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

The defaults work for local development.

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run Database Migrations

```bash
cd packages/db && pnpm drizzle-kit push && cd ../..
```

### 5. Start All Applications

```bash
pnpm dev
```

This starts:
- **Engine** on http://localhost:3000 (API server + workers)
- **Studio** on http://localhost:3001 (Admin panel)
- **Canvas** on http://localhost:3002 (Page builder + runtime)

### 6. Seed Demo Data

```bash
pnpm seed
```

This creates:
- 50 mock players with varied attributes
- 3 demo campaigns (2 active, 1 scheduled)
- ~500 BET events and ~200 DEPOSIT events
- 20 wheel spin results

## Demo Scenarios

### Scenario 1: Create a Campaign End-to-End

1. Open http://localhost:3001 and log in with `admin@promotionos.io` / `admin123`
2. Click **Create Campaign** on the dashboard
3. **Step 1 (Basics):** Enter name, slug, dates, currency
4. **Step 2 (Targeting):** Select "Open to all players" or create a segment
5. **Step 3 (Mechanics):** Add a Wheel mechanic and a Leaderboard mechanic
6. **Step 4 (Triggers):** Configure BET triggers for both mechanics
7. **Step 5 (Rewards):** Set wheel slices and leaderboard prizes
8. **Step 6 (Frontend):** Use the embedded canvas builder to design the page
   - Drag a Hero block onto the canvas
   - Drag a Wheel Widget and bind it to the wheel mechanic
   - Drag a Leaderboard Widget and bind it to the leaderboard
   - Customize colors and save
9. **Step 7 (Review):** Verify all checks are green, click **Activate Now**

### Scenario 2: Player Interaction

1. Find a player's session token from PromoStudio > Players page (or use the seed output)
2. Open the canvas runtime: `http://localhost:3002/summer-slots-festival?token=<TOKEN>`
3. The promotion page loads with all widgets
4. Click **Spin** on the wheel — watch the animation and reward result
5. View the leaderboard — the player's rank is highlighted
6. Check reward history — spin rewards appear

### Scenario 3: Live Event Processing

1. Use curl to ingest events for a player:

```bash
curl -X POST http://localhost:3000/api/v1/events/ingest \
  -H "Content-Type: application/json" \
  -H "x-session-token: <PLAYER_TOKEN>" \
  -d '{"eventType":"BET","campaignId":"<CAMPAIGN_ID>","payload":{"amount":100,"gameCategory":"slots"}}'
```

2. Wait 10 seconds for the aggregation pipeline to process
3. Refresh the runtime page — leaderboard score updates
4. In Studio, check the Event Log page for the ingested event

### Scenario 4: Campaign Lifecycle

1. In Studio, view the campaign detail page
2. Click **Pause** to temporarily halt the campaign
3. Click **Resume** to reactivate
4. Click **End** to conclude the campaign
5. View the runtime page — "Promotion has ended" banner appears
6. Click **Archive** in Studio — campaign moves to archived status

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│   PromoStudio    │────▶│   PromoEngine    │◀────│  PromoCanvas   │
│  (Admin Panel)   │     │  (API + Workers) │     │ (Builder/Runtime)
│  localhost:3001  │     │  localhost:3000   │     │  localhost:3002 │
└─────────────────┘     └──────────────────┘     └────────────────┘
                              │       │
                        ┌─────┘       └─────┐
                        ▼                   ▼
                   PostgreSQL           Redis
                   (Neon/local)     (Upstash/local)
```

## Environment Variables

See `.env.example` for the complete list with descriptions.

## Troubleshooting

- **Engine won't start:** Check DATABASE_URL and REDIS_URL in `.env`
- **Studio shows "Connection lost":** Ensure engine is running on the correct port
- **Canvas builder won't load:** Check NEXT_PUBLIC_ENGINE_URL in canvas `.env.local`
- **Wheel spin fails:** Ensure the campaign is active and the player has an active session
- **Leaderboard empty:** Wait for the aggregation pipeline to process events (~10s)
