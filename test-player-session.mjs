// PromotionOS Player-Session Integration Test Harness
//
// Complements test-mechanics.mjs / test-mechanics-extended.mjs by exercising
// the code paths those scripts could only mark SETUP_OK — specifically the
// T3 flow: Wheel -> Leaderboard via MECHANIC_OUTCOME. Those flows need a
// real player session token on `x-session-token`, so we mint one using the
// admin-only `POST /api/v1/admin/players/:id/session` endpoint against a
// pre-seeded mock player.
//
// Flow:
//   1. Admin login -> JWT
//   2. GET /api/v1/admin/players -> pick a seeded mock player
//   3. POST /api/v1/admin/players/:id/session -> mint session token
//   4. Admin creates campaign + WHEEL mechanic + rewards + LEADERBOARD + agg rule
//   5. Admin activates campaign
//   6. Player opts in  (POST /campaigns/:slug/opt-in)
//   7. Player spins   (POST /mechanics/:id/spin) x N
//   8. Verify reward rows + leaderboard ranking populated
//
// Run with: `node test-player-session.mjs` (requires engine on :3000 with workers).

const BASE = process.env.ENGINE_URL ?? 'http://localhost:3000'
const TS = Date.now()
const SPIN_COUNT = Number(process.env.SPIN_COUNT ?? 5)
let ADMIN_TOKEN = ''

const PASS = (msg) => console.log(`\x1b[32m✅ PASS: ${msg}\x1b[0m`)
const FAIL = (msg, extra) => {
  console.log(`\x1b[31m❌ FAIL: ${msg}\x1b[0m`)
  if (extra) console.log('  ' + (typeof extra === 'string' ? extra : JSON.stringify(extra).slice(0, 400)))
}
const INFO = (msg) => console.log(`\x1b[33m→ ${msg}\x1b[0m`)
const SECTION = (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`)

async function api(method, path, body, headers = {}) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (body) opts.body = JSON.stringify(body)
  const resp = await fetch(`${BASE}${path}`, opts)
  const json = await resp.json().catch(() => ({}))
  return { status: resp.status, body: json }
}

const adminApi = (m, p, b) =>
  api(m, p, b, { Authorization: `Bearer ${ADMIN_TOKEN}` })

const playerApi = (token, m, p, b) =>
  api(m, p, b, { 'x-session-token': token })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function adminLogin() {
  const r = await api('POST', '/api/v1/admin/auth/login', {
    email: 'admin@promotionos.dev',
    password: 'admin123',
  })
  ADMIN_TOKEN = r.body?.data?.token
  if (!ADMIN_TOKEN) {
    FAIL('Admin login', r.body)
    process.exit(1)
  }
  PASS('Admin login')
}

async function pickSeededPlayer() {
  const r = await adminApi('GET', '/api/v1/admin/players?page=1&limit=10')
  const players = r.body?.data?.players ?? []
  if (players.length === 0) {
    FAIL('No seeded players — run `pnpm seed` first', r.body)
    process.exit(1)
  }
  const player = players[0]
  INFO(`Using player ${player.id} (${player.displayName ?? player.externalId})`)
  return player
}

async function mintSession(playerId) {
  const r = await adminApi('POST', `/api/v1/admin/players/${playerId}/session`)
  const token = r.body?.data?.token
  if (!token) {
    FAIL('Mint session', r.body)
    process.exit(1)
  }
  PASS(`Minted session token (len=${token.length})`)
  return token
}

async function setupCampaign(playerId) {
  const slug = `tph-${TS}`
  const createCampaign = await adminApi('POST', '/api/v1/admin/campaigns', {
    name: `Player-Harness ${TS}`,
    slug,
    startsAt: '2026-04-01T00:00:00Z',
    endsAt: '2026-05-30T23:59:59Z',
  })
  const campaignId = createCampaign.body?.data?.campaign?.id
  if (!campaignId) {
    FAIL('Create campaign', createCampaign.body)
    process.exit(1)
  }
  PASS(`Created campaign ${campaignId} (slug=${slug})`)

  // WHEEL mechanic
  const wheel = await adminApi('POST', `/api/v1/admin/campaigns/${campaignId}/mechanics`, {
    type: 'WHEEL',
    config: { spin_trigger: 'manual', max_spins_campaign: 100, max_spins_per_day: 50 },
    displayOrder: 0,
    isActive: true,
  })
  const wheelId = wheel.body?.data?.id
  if (!wheelId) {
    FAIL('Create WHEEL', wheel.body)
    process.exit(1)
  }
  PASS(`Created WHEEL ${wheelId}`)

  // Wheel prizes — VIRTUAL_COINS of varying amounts; all emit MECHANIC_OUTCOME
  const prizes = [
    { config: { coins: 25 }, weight: 50 },
    { config: { coins: 100 }, weight: 30 },
    { config: { coins: 10 }, weight: 20 },
  ]
  for (const p of prizes) {
    const r = await adminApi(
      'POST',
      `/api/v1/admin/mechanics/${wheelId}/reward-definitions`,
      { type: 'VIRTUAL_COINS', config: p.config, probabilityWeight: p.weight },
    )
    if (!r.body?.data?.id) {
      FAIL(`Create prize ${JSON.stringify(p.config)}`, r.body)
      process.exit(1)
    }
  }
  PASS(`Created ${prizes.length} wheel prizes`)

  // LEADERBOARD ranking on MECHANIC_OUTCOME_SUM (empty prize_distribution — we
  // only verify the ranking populates, not finalization payout; T5/T11/T14
  // finalization is covered by the unit tests in leaderboard-finalize.test.ts)
  const leaderboard = await adminApi(
    'POST',
    `/api/v1/admin/campaigns/${campaignId}/mechanics`,
    {
      type: 'LEADERBOARD',
      config: {
        ranking_metric: 'MECHANIC_OUTCOME_SUM',
        window_type: 'campaign',
        tie_breaking: 'first_to_reach',
        max_displayed_ranks: 50,
        prize_distribution: [],
      },
      displayOrder: 1,
      isActive: true,
    },
  )
  const leaderboardId = leaderboard.body?.data?.id
  if (!leaderboardId) {
    FAIL('Create LEADERBOARD', leaderboard.body)
    process.exit(1)
  }
  PASS(`Created LEADERBOARD ${leaderboardId}`)

  // Aggregation rule auto-inject (Phase 1.1) should already produce the
  // MECHANIC_OUTCOME -> leaderboard rule. Explicitly POST as fallback for
  // older engine builds that don't auto-inject.
  const agg = await adminApi(
    'POST',
    `/api/v1/admin/campaigns/${campaignId}/aggregation-rules`,
    {
      mechanicId: leaderboardId,
      sourceEventType: 'MECHANIC_OUTCOME',
      metric: 'SUM',
      transformation: { operation: 'NONE', field: 'amount' },
      windowType: 'campaign',
    },
  )
  if (agg.status >= 400 && agg.body?.error?.code !== 'AGG_RULE_DUPLICATE') {
    INFO(`Agg rule POST returned ${agg.status} (${agg.body?.error?.code}) — likely already injected`)
  } else {
    PASS('Ensured MECHANIC_OUTCOME_SUM aggregation rule')
  }

  // Activate
  const activate = await adminApi(
    'PATCH',
    `/api/v1/admin/campaigns/${campaignId}/status`,
    { status: 'active' },
  )
  if (!activate.body?.success) {
    FAIL('Activate campaign', activate.body)
    process.exit(1)
  }
  PASS('Activated campaign')

  return { campaignId, slug, wheelId, leaderboardId }
}

async function playerOptIn(token, slug) {
  const r = await playerApi(token, 'POST', `/api/v1/campaigns/${slug}/opt-in`)
  if (r.status === 200 || r.status === 201) {
    PASS('Player opted in')
    return true
  }
  if (r.body?.error?.code === 'ALREADY_OPTED_IN') {
    INFO('Player already opted in (idempotent)')
    return true
  }
  FAIL('Opt-in', r.body)
  return false
}

async function playerSpin(token, wheelId, n) {
  const results = []
  for (let i = 0; i < n; i++) {
    const r = await playerApi(token, 'POST', `/api/v1/mechanics/${wheelId}/spin`)
    if (r.status !== 200 || !r.body?.success) {
      FAIL(`Spin #${i + 1}`, r.body)
      return results
    }
    results.push(r.body.data)
  }
  PASS(`Completed ${results.length} spin(s)`)
  return results
}

function summarizeSpins(spins) {
  const coinsWon = spins.reduce((acc, s) => {
    const c = s?.reward?.config?.coins ?? s?.prize?.coins ?? 0
    return acc + Number(c ?? 0)
  }, 0)
  return { count: spins.length, coinsWon }
}

async function fetchLeaderboard(token, leaderboardId) {
  const r = await playerApi(
    token,
    'GET',
    `/api/v1/mechanics/${leaderboardId}/leaderboard?page=1&pageSize=20`,
  )
  if (!r.body?.success) {
    FAIL('Fetch leaderboard', r.body)
    return null
  }
  return r.body.data
}

async function main() {
  SECTION('PLAYER-SESSION HARNESS — T3 Wheel → Leaderboard (end-to-end with real spin)')

  await adminLogin()
  const player = await pickSeededPlayer()
  const sessionToken = await mintSession(player.id)

  const { campaignId, slug, wheelId, leaderboardId } = await setupCampaign(player.id)

  const ok = await playerOptIn(sessionToken, slug)
  if (!ok) process.exit(2)

  SECTION(`Spinning wheel ${SPIN_COUNT}x as player`)
  const spins = await playerSpin(sessionToken, wheelId, SPIN_COUNT)
  const summary = summarizeSpins(spins)
  INFO(`Spins: ${summary.count}, approximate coins: ${summary.coinsWon}`)

  SECTION('Waiting for reward-executor + aggregation pipeline to flush')
  await sleep(6000)

  SECTION('Verification')

  // 1. At least one spin rewarded (manual smoke — exact shape depends on wheel service)
  if (spins.length > 0) {
    PASS(`Wheel service returned ${spins.length} spin result(s)`)
  } else {
    FAIL('No spin results — cannot verify downstream')
  }

  // 2. Leaderboard should list at least our player once the MECHANIC_OUTCOME
  //    aggregation pipeline catches up. This validates the full chain:
  //    spin -> reward row -> reward-executor -> emitMechanicOutcome ->
  //    aggregator -> player_campaign_stats -> leaderboard read.
  const lb = await fetchLeaderboard(sessionToken, leaderboardId)
  if (!lb) {
    process.exit(3)
  }
  const entry = (lb.entries ?? []).find((e) => e.isCurrentPlayer)
  if (entry) {
    PASS(`Player ranked #${entry.rank} with value=${entry.value} on leaderboard`)
  } else if (lb.playerRank != null) {
    PASS(`Player ranked #${lb.playerRank} (off current page)`)
  } else {
    FAIL(
      'Player not on leaderboard — MECHANIC_OUTCOME pipeline may be lagging or workers disabled',
      { totalEntries: lb.entries?.length ?? 0, totalParticipants: lb.meta?.totalParticipants },
    )
  }

  SECTION('SUMMARY')
  console.log(JSON.stringify({
    campaignId,
    slug,
    wheelId,
    leaderboardId,
    playerId: player.id,
    spinCount: summary.count,
    leaderboardEntries: lb.entries?.length ?? 0,
    playerRank: entry?.rank ?? lb.playerRank ?? null,
  }, null, 2))
}

main().catch((err) => {
  console.error('Harness crashed:', err)
  process.exit(99)
})
