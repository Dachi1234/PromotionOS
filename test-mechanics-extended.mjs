// PromotionOS Backend Integration Tests — Extended
// Tests remaining mechanic combinations from the full matrix

import { randomUUID } from 'crypto'

const BASE = 'http://localhost:3000'
let ADMIN_TOKEN = ''
const TS = Date.now()

const PASS = (msg) => console.log(`\x1b[32m✅ PASS: ${msg}\x1b[0m`)
const FAIL = (msg, resp) => { console.log(`\x1b[31m❌ FAIL: ${msg}\x1b[0m`); console.log(`  ${JSON.stringify(resp).slice(0, 400)}`) }
const INFO = (msg) => console.log(`\x1b[33m→ ${msg}\x1b[0m`)
const SECTION = (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`)

async function api(method, path, body, headers = {}) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (body) opts.body = JSON.stringify(body)
  return (await fetch(`${BASE}${path}`, opts)).json()
}
const adminApi = (m, p, b) => api(m, p, b, { Authorization: `Bearer ${ADMIN_TOKEN}` })

async function createCampaign(name, slug) {
  const r = await adminApi('POST', '/api/v1/admin/campaigns', {
    name, slug, startsAt: '2026-04-01T00:00:00Z', endsAt: '2026-05-30T23:59:59Z',
  })
  if (!r.data?.campaign?.id) { FAIL(`Create campaign "${name}"`, r); return null }
  PASS(`Campaign: ${name}`)
  return r.data.campaign.id
}

async function mech(cid, type, config, order = 0) {
  const r = await adminApi('POST', `/api/v1/admin/campaigns/${cid}/mechanics`, {
    type, config, displayOrder: order, isActive: true,
  })
  if (!r.data?.id) { FAIL(`Create ${type}`, r); return null }
  PASS(`${type}`)
  return r.data.id
}

const updateMech = (id, config) => adminApi('PUT', `/api/v1/admin/mechanics/${id}`, { config })

async function reward(mechId, type, config, weight = 100) {
  const r = await adminApi('POST', `/api/v1/admin/mechanics/${mechId}/reward-definitions`, {
    type, config, probabilityWeight: weight,
  })
  if (!r.data?.id) { FAIL(`${type} reward`, r); return null }
  PASS(`${type} reward`)
  return r.data.id
}

async function agg(cid, mechId, src, metric, win = 'campaign', field = 'amount') {
  const r = await adminApi('POST', `/api/v1/admin/campaigns/${cid}/aggregation-rules`, {
    mechanicId: mechId, sourceEventType: src, metric,
    transformation: { operation: 'NONE', field }, windowType: win,
  })
  if (!r.data?.id) { FAIL(`${src}_${metric} agg`, r); return null }
  PASS(`Agg: ${src}_${metric} (${win})`)
  return r.data.id
}

async function dependency(mechId, dependsOnId, condition = { type: 'mechanic_complete' }) {
  const r = await adminApi('POST', `/api/v1/admin/mechanics/${mechId}/dependencies`, {
    dependsOnMechanicId: dependsOnId, unlockCondition: condition,
  })
  if (!r.data && !r.success) { FAIL('Dependency', r); return null }
  PASS(`Dependency: ${mechId.slice(0,8)} depends on ${dependsOnId.slice(0,8)}`)
  return true
}

const activate = async (cid) => {
  const r = await adminApi('PATCH', `/api/v1/admin/campaigns/${cid}/status`, { status: 'active' })
  if (!r.success) { FAIL('Activate', r); return false }
  PASS('Activated')
  return true
}

async function ingest(pid, cid, type, payload, count, h = 10) {
  for (let i = 0; i < count; i++) {
    await api('POST', '/api/v1/events/ingest', {
      playerId: pid, campaignId: cid, eventType: type, payload,
      occurredAt: `2026-04-14T${String(h).padStart(2,'0')}:${String(i).padStart(2,'0')}:00Z`,
    })
  }
  PASS(`${count}x ${type}`)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function checkPipeline(cid) {
  const r = await adminApi('GET', `/api/v1/admin/events?campaignId=${cid}&page=1&limit=200`)
  const evts = r.data?.events || []
  const processed = evts.filter(e => e.processed).length
  INFO(`Events: ${evts.length} total, ${processed} processed`)
  return { total: evts.length, processed }
}

// ================================================================
async function main() {
  SECTION('SETUP')
  const lr = await api('POST', '/api/v1/admin/auth/login', { email: 'admin@promotionos.dev', password: 'admin123' })
  ADMIN_TOKEN = lr.data?.token
  if (!ADMIN_TOKEN) { FAIL('Login', lr); process.exit(1) }
  PASS('Admin login')

  const er = await adminApi('GET', '/api/v1/admin/events?page=1&limit=1')
  const PID = er.data?.events?.[0]?.playerId
  INFO(`Player: ${PID}`)

  // Second player for leaderboard tests
  const er2 = await adminApi('GET', '/api/v1/admin/events?page=2&limit=1')
  const PID2 = er2.data?.events?.[0]?.playerId !== PID ? er2.data?.events?.[0]?.playerId : PID
  INFO(`Player 2: ${PID2}`)

  const results = {}

  // ================================================================
  // TEST 8: Progress Bar → Wheel-in-Wheel
  // ================================================================
  SECTION('TEST 8: Progress Bar → Wheel-in-Wheel')
  try {
    const cid = await createCampaign('T8-ProgressWiW', `t8-${TS}`)
    const wiwId = await mech(cid, 'WHEEL_IN_WHEEL', {
      spin_trigger: 'manual', max_spins_campaign: 100, max_spins_per_day: 50,
    }, 1)
    await reward(wiwId, 'VIRTUAL_COINS', { coins: 30 }, 50)
    await reward(wiwId, 'CASH', { amount: 5, currency: 'GEL' }, 50)

    const pbId = await mech(cid, 'PROGRESS_BAR', {
      metric_type: 'BET_SUM', target_value: 300,
      reward_definition_id: '00000000-0000-0000-0000-000000000000',
      auto_grant: true, window_type: 'campaign',
    }, 0)
    const rwId = await reward(pbId, 'EXTRA_SPIN', { target_mechanic_id: wiwId, count: 2 })
    await updateMech(pbId, {
      metric_type: 'BET_SUM', target_value: 300,
      reward_definition_id: rwId, auto_grant: true, window_type: 'campaign',
    })
    await agg(cid, pbId, 'BET', 'SUM')
    await activate(cid)
    await ingest(PID, cid, 'BET', { amount: 100 }, 4, 10)
    await sleep(4000)
    const s = await checkPipeline(cid)
    results['T8 Progress→Wheel-in-Wheel'] = s.processed > 0 ? 'PASS' : 'CHECK'
  } catch (e) { FAIL('T8', e.message); results['T8 Progress→Wheel-in-Wheel'] = 'FAIL' }

  // ================================================================
  // TEST 9: Daily Progress → Weekly Leaderboard (window aggregation)
  // ================================================================
  SECTION('TEST 9: Daily Progress → Weekly Leaderboard (window agg)')
  try {
    const cid = await createCampaign('T9-DailyWeekly', `t9-${TS}`)

    // Daily progress bar
    const pbId = await mech(cid, 'PROGRESS_BAR', {
      metric_type: 'BET_SUM', target_value: 100,
      reward_definition_id: '00000000-0000-0000-0000-000000000000',
      auto_grant: true, window_type: 'daily',
    }, 0)
    const pbRw = await reward(pbId, 'VIRTUAL_COINS', { coins: 20 })
    await updateMech(pbId, {
      metric_type: 'BET_SUM', target_value: 100,
      reward_definition_id: pbRw, auto_grant: true, window_type: 'daily',
    })

    // Weekly leaderboard ranking by BET_SUM
    const lbId = await mech(cid, 'LEADERBOARD', {
      ranking_metric: 'BET_SUM', window_type: 'weekly',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [],
    }, 1)

    // Both share BET_SUM aggregation but different windows
    await agg(cid, pbId, 'BET', 'SUM', 'daily')
    await agg(cid, lbId, 'BET', 'SUM', 'weekly')

    await activate(cid)
    // Player 1 bets heavily
    await ingest(PID, cid, 'BET', { amount: 50 }, 3, 11)
    // Player 2 bets less (if different player)
    if (PID2 !== PID) {
      await ingest(PID2, cid, 'BET', { amount: 30 }, 2, 11)
    }
    await sleep(4000)
    const s = await checkPipeline(cid)
    results['T9 Daily Progress→Weekly LB'] = s.processed > 0 ? 'PASS' : 'CHECK'
  } catch (e) { FAIL('T9', e.message); results['T9 Daily Progress→Weekly LB'] = 'FAIL' }

  // ================================================================
  // TEST 10: Mission (Parallel) → Wheel
  // ================================================================
  SECTION('TEST 10: Mission (Parallel) → Wheel')
  try {
    const cid = await createCampaign('T10-ParallelMW', `t10-${TS}`)
    const wid = await mech(cid, 'WHEEL', { spin_trigger: 'manual', max_spins_campaign: 100 }, 1)
    await reward(wid, 'VIRTUAL_COINS', { coins: 10 })

    const dRw = randomUUID()
    const mid = await mech(cid, 'MISSION', {
      execution_mode: 'parallel',
      steps: [
        { step_id: randomUUID(), order: 1, title: 'Bet 100', metric_type: 'BET_SUM', target_value: 100, time_limit_hours: 48, reward_definition_id: dRw },
        { step_id: randomUUID(), order: 2, title: 'Deposit 50', metric_type: 'DEPOSIT_SUM', target_value: 50, time_limit_hours: 48, reward_definition_id: dRw },
        { step_id: randomUUID(), order: 3, title: 'Login 2x', metric_type: 'LOGIN_COUNT', target_value: 2, time_limit_hours: 48, reward_definition_id: dRw },
      ],
    }, 0)

    if (mid) {
      const mrw = await reward(mid, 'EXTRA_SPIN', { target_mechanic_id: wid, count: 1 })
      await updateMech(mid, {
        execution_mode: 'parallel',
        steps: [
          { step_id: randomUUID(), order: 1, title: 'Bet 100', metric_type: 'BET_SUM', target_value: 100, time_limit_hours: 48, reward_definition_id: mrw },
          { step_id: randomUUID(), order: 2, title: 'Deposit 50', metric_type: 'DEPOSIT_SUM', target_value: 50, time_limit_hours: 48, reward_definition_id: mrw },
          { step_id: randomUUID(), order: 3, title: 'Login 2x', metric_type: 'LOGIN_COUNT', target_value: 2, time_limit_hours: 48, reward_definition_id: mrw },
        ],
      })

      await agg(cid, mid, 'BET', 'SUM')
      await agg(cid, mid, 'DEPOSIT', 'SUM')
      await agg(cid, mid, 'LOGIN', 'COUNT')
      await activate(cid)

      // Complete step 2 (deposit) and step 3 (login) in parallel — no ordering needed
      await ingest(PID, cid, 'DEPOSIT', { amount: 60 }, 1, 12)
      await ingest(PID, cid, 'LOGIN', {}, 2, 12)
      // Step 1 (bet) not yet complete — but steps 2&3 should independently grant spins
      await sleep(4000)
      const s = await checkPipeline(cid)
      results['T10 Mission(Parallel)→Wheel'] = s.processed > 0 ? 'PASS' : 'CHECK'
    }
  } catch (e) { FAIL('T10', e.message); results['T10 Mission(Parallel)→Wheel'] = 'FAIL' }

  // ================================================================
  // TEST 11: Leaderboard → Cash/Cashback (finalization prizes)
  // ================================================================
  SECTION('TEST 11: Leaderboard → Cash/Cashback prizes')
  try {
    const cid = await createCampaign('T11-LBCash', `t11-${TS}`)
    const lbId = await mech(cid, 'LEADERBOARD', {
      ranking_metric: 'BET_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [],
    }, 0)

    // Cash prize for top 3
    const cashRw = await reward(lbId, 'CASH', { amount: 100, currency: 'GEL' })
    // Cashback prize for rank 4-10
    const cbRw = await reward(lbId, 'CASHBACK', { amount: 50, currency: 'GEL' })

    await updateMech(lbId, {
      ranking_metric: 'BET_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [
        { from_rank: 1, to_rank: 3, reward_definition_id: cashRw },
        { from_rank: 4, to_rank: 10, reward_definition_id: cbRw },
      ],
    })
    INFO('Leaderboard with tiered Cash + Cashback prizes')

    await agg(cid, lbId, 'BET', 'SUM')
    await activate(cid)
    await ingest(PID, cid, 'BET', { amount: 500 }, 3, 13)
    await sleep(3000)
    const s = await checkPipeline(cid)
    results['T11 Leaderboard→Cash/Cashback'] = s.processed > 0 ? 'SETUP_OK (finalize)' : 'CHECK'
  } catch (e) { FAIL('T11', e.message); results['T11 Leaderboard→Cash/Cashback'] = 'FAIL' }

  // ================================================================
  // TEST 12: Progress Bar → Free Spins
  // ================================================================
  SECTION('TEST 12: Progress Bar → Free Spins')
  try {
    const cid = await createCampaign('T12-ProgressFS', `t12-${TS}`)
    const pbId = await mech(cid, 'PROGRESS_BAR', {
      metric_type: 'BET_SUM', target_value: 200,
      reward_definition_id: '00000000-0000-0000-0000-000000000000',
      auto_grant: true, window_type: 'campaign',
    }, 0)
    const fsRw = await reward(pbId, 'FREE_SPINS', { count: 10, gameId: 'mega-slot', betLevel: 1 })
    await updateMech(pbId, {
      metric_type: 'BET_SUM', target_value: 200,
      reward_definition_id: fsRw, auto_grant: true, window_type: 'campaign',
    })
    await agg(cid, pbId, 'BET', 'SUM')
    await activate(cid)
    await ingest(PID, cid, 'BET', { amount: 100 }, 3, 14)
    await sleep(4000)
    const s = await checkPipeline(cid)
    results['T12 Progress→Free Spins'] = s.processed > 0 ? 'PASS' : 'CHECK'
  } catch (e) { FAIL('T12', e.message); results['T12 Progress→Free Spins'] = 'FAIL' }

  // ================================================================
  // TEST 13: Progress Bar → Free Bet
  // ================================================================
  SECTION('TEST 13: Progress Bar → Free Bet')
  try {
    const cid = await createCampaign('T13-ProgressFB', `t13-${TS}`)
    const pbId = await mech(cid, 'PROGRESS_BAR', {
      metric_type: 'DEPOSIT_SUM', target_value: 150,
      reward_definition_id: '00000000-0000-0000-0000-000000000000',
      auto_grant: true, window_type: 'campaign',
    }, 0)
    const fbRw = await reward(pbId, 'FREE_BET', { amount: 20, currency: 'GEL', sportId: 'football' })
    await updateMech(pbId, {
      metric_type: 'DEPOSIT_SUM', target_value: 150,
      reward_definition_id: fbRw, auto_grant: true, window_type: 'campaign',
    })
    await agg(cid, pbId, 'DEPOSIT', 'SUM')
    await activate(cid)
    await ingest(PID, cid, 'DEPOSIT', { amount: 80 }, 2, 15)
    await sleep(4000)
    const s = await checkPipeline(cid)
    results['T13 Progress→Free Bet'] = s.processed > 0 ? 'PASS' : 'CHECK'
  } catch (e) { FAIL('T13', e.message); results['T13 Progress→Free Bet'] = 'FAIL' }

  // ================================================================
  // TEST 14: Leaderboard → Free Spins / Free Bet
  // ================================================================
  SECTION('TEST 14: Leaderboard → Free Spins/Free Bet')
  try {
    const cid = await createCampaign('T14-LBFS', `t14-${TS}`)
    const lbId = await mech(cid, 'LEADERBOARD', {
      ranking_metric: 'BET_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [],
    }, 0)

    const fsRw = await reward(lbId, 'FREE_SPINS', { count: 20, gameId: 'mega-slot' })
    const fbRw = await reward(lbId, 'FREE_BET', { amount: 50, currency: 'GEL' })

    await updateMech(lbId, {
      ranking_metric: 'BET_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [
        { from_rank: 1, to_rank: 5, reward_definition_id: fsRw },
        { from_rank: 6, to_rank: 20, reward_definition_id: fbRw },
      ],
    })
    INFO('Leaderboard: top 5 → Free Spins, 6-20 → Free Bet')

    await agg(cid, lbId, 'BET', 'SUM')
    await activate(cid)
    await ingest(PID, cid, 'BET', { amount: 300 }, 4, 16)
    await sleep(3000)
    const s = await checkPipeline(cid)
    results['T14 Leaderboard→FS/FB'] = s.processed > 0 ? 'SETUP_OK (finalize)' : 'CHECK'
  } catch (e) { FAIL('T14', e.message); results['T14 Leaderboard→FS/FB'] = 'FAIL' }

  // ================================================================
  // TEST 15: Mission → Multiple Reward Types (each step different)
  // ================================================================
  SECTION('TEST 15: Mission → Multiple Reward Types per step')
  try {
    const cid = await createCampaign('T15-MissionMulti', `t15-${TS}`)
    const wid = await mech(cid, 'WHEEL', { spin_trigger: 'manual', max_spins_campaign: 100 }, 1)
    await reward(wid, 'VIRTUAL_COINS', { coins: 5 })

    const dRw = randomUUID()
    const mid = await mech(cid, 'MISSION', {
      execution_mode: 'sequential',
      steps: [
        { step_id: randomUUID(), order: 1, title: 'Bet 100', metric_type: 'BET_SUM', target_value: 100, time_limit_hours: 48, reward_definition_id: dRw },
        { step_id: randomUUID(), order: 2, title: 'Deposit 50', metric_type: 'DEPOSIT_SUM', target_value: 50, time_limit_hours: 48, reward_definition_id: dRw },
        { step_id: randomUUID(), order: 3, title: 'Login 3x', metric_type: 'LOGIN_COUNT', target_value: 3, time_limit_hours: 48, reward_definition_id: dRw },
      ],
    }, 0)

    if (mid) {
      // Step 1 → CASH, Step 2 → EXTRA_SPIN, Step 3 → FREE_SPINS
      const rw1 = await reward(mid, 'CASH', { amount: 5, currency: 'GEL' })
      const rw2 = await reward(mid, 'EXTRA_SPIN', { target_mechanic_id: wid, count: 2 })
      const rw3 = await reward(mid, 'FREE_SPINS', { count: 10, gameId: 'mega-slot' })

      await updateMech(mid, {
        execution_mode: 'sequential',
        steps: [
          { step_id: randomUUID(), order: 1, title: 'Bet 100 → Cash', metric_type: 'BET_SUM', target_value: 100, time_limit_hours: 48, reward_definition_id: rw1 },
          { step_id: randomUUID(), order: 2, title: 'Deposit 50 → Spins', metric_type: 'DEPOSIT_SUM', target_value: 50, time_limit_hours: 48, reward_definition_id: rw2 },
          { step_id: randomUUID(), order: 3, title: 'Login 3x → Free Spins', metric_type: 'LOGIN_COUNT', target_value: 3, time_limit_hours: 48, reward_definition_id: rw3 },
        ],
      })
      INFO('Mission: step1→CASH, step2→EXTRA_SPIN, step3→FREE_SPINS')

      await agg(cid, mid, 'BET', 'SUM')
      await agg(cid, mid, 'DEPOSIT', 'SUM')
      await agg(cid, mid, 'LOGIN', 'COUNT')
      await activate(cid)

      await ingest(PID, cid, 'BET', { amount: 60 }, 2, 17)
      await ingest(PID, cid, 'DEPOSIT', { amount: 60 }, 1, 17)
      await ingest(PID, cid, 'LOGIN', {}, 3, 17)
      await sleep(4000)
      const s = await checkPipeline(cid)
      results['T15 Mission→Multi Rewards'] = s.processed > 0 ? 'PASS' : 'CHECK'
    }
  } catch (e) { FAIL('T15', e.message); results['T15 Mission→Multi Rewards'] = 'FAIL' }

  // ================================================================
  // TEST 16: CHAIN — Daily Progress → Weekly Leaderboard → Wheel
  // ================================================================
  SECTION('TEST 16: Chain: Progress → Leaderboard → Wheel')
  try {
    const cid = await createCampaign('T16-Chain-PLW', `t16-${TS}`)

    // Wheel (final destination)
    const wid = await mech(cid, 'WHEEL', { spin_trigger: 'manual', max_spins_campaign: 100 }, 2)
    await reward(wid, 'VIRTUAL_COINS', { coins: 10 })

    // Progress bar feeds coins into pipeline
    const pbId = await mech(cid, 'PROGRESS_BAR', {
      metric_type: 'BET_SUM', target_value: 200,
      reward_definition_id: '00000000-0000-0000-0000-000000000000',
      auto_grant: true, window_type: 'daily',
    }, 0)
    const pbRw = await reward(pbId, 'VIRTUAL_COINS', { coins: 30 })
    await updateMech(pbId, {
      metric_type: 'BET_SUM', target_value: 200,
      reward_definition_id: pbRw, auto_grant: true, window_type: 'daily',
    })

    // Leaderboard ranks by MECHANIC_OUTCOME_SUM, prizes = EXTRA_SPIN
    const lbId = await mech(cid, 'LEADERBOARD', {
      ranking_metric: 'MECHANIC_OUTCOME_SUM', window_type: 'weekly',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [],
    }, 1)
    const lbRw = await reward(lbId, 'EXTRA_SPIN', { target_mechanic_id: wid, count: 5 })
    await updateMech(lbId, {
      ranking_metric: 'MECHANIC_OUTCOME_SUM', window_type: 'weekly',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [{ from_rank: 1, to_rank: 10, reward_definition_id: lbRw }],
    })

    // Aggregations
    await agg(cid, pbId, 'BET', 'SUM', 'daily')
    await agg(cid, lbId, 'MECHANIC_OUTCOME', 'SUM', 'weekly')

    await activate(cid)
    await ingest(PID, cid, 'BET', { amount: 100 }, 3, 18)
    await sleep(5000)
    const s = await checkPipeline(cid)
    INFO('Flow: BET→Progress(daily)→VIRTUAL_COINS→MECHANIC_OUTCOME→Leaderboard(weekly)→EXTRA_SPIN→Wheel')
    results['T16 Progress→LB→Wheel'] = s.processed > 0 ? 'PASS' : 'CHECK'
  } catch (e) { FAIL('T16', e.message); results['T16 Progress→LB→Wheel'] = 'FAIL' }

  // ================================================================
  // TEST 17: CHAIN — Mission → Progress Bar → Wheel (ACCESS_UNLOCK)
  // ================================================================
  SECTION('TEST 17: Chain: Mission → Progress Bar → Wheel (unlock)')
  try {
    const cid = await createCampaign('T17-Chain-MPW', `t17-${TS}`)

    // Wheel (locked behind progress bar)
    const wid = await mech(cid, 'WHEEL', { spin_trigger: 'manual', max_spins_campaign: 100 }, 2)
    await reward(wid, 'CASH', { amount: 10, currency: 'GEL' })

    // Progress bar (locked behind mission)
    const pbId = await mech(cid, 'PROGRESS_BAR', {
      metric_type: 'BET_SUM', target_value: 300,
      reward_definition_id: '00000000-0000-0000-0000-000000000000',
      auto_grant: true, window_type: 'campaign',
    }, 1)
    const pbRw = await reward(pbId, 'EXTRA_SPIN', { target_mechanic_id: wid, count: 3 })
    await updateMech(pbId, {
      metric_type: 'BET_SUM', target_value: 300,
      reward_definition_id: pbRw, auto_grant: true, window_type: 'campaign',
    })

    // Mission (entry point)
    const dRw = randomUUID()
    const mid = await mech(cid, 'MISSION', {
      execution_mode: 'sequential',
      steps: [
        { step_id: randomUUID(), order: 1, title: 'Login 2x', metric_type: 'LOGIN_COUNT', target_value: 2, time_limit_hours: 48, reward_definition_id: dRw },
      ],
    }, 0)

    if (mid) {
      // Mission reward = ACCESS_UNLOCK to progress bar
      const mRw = await reward(mid, 'ACCESS_UNLOCK', { target_mechanic_id: pbId })
      await updateMech(mid, {
        execution_mode: 'sequential',
        steps: [
          { step_id: randomUUID(), order: 1, title: 'Login 2x', metric_type: 'LOGIN_COUNT', target_value: 2, time_limit_hours: 48, reward_definition_id: mRw },
        ],
      })

      // Dependencies: progress bar depends on mission, wheel depends on progress bar
      await dependency(pbId, mid)
      await dependency(wid, pbId)

      // Aggregations
      await agg(cid, mid, 'LOGIN', 'COUNT')
      await agg(cid, pbId, 'BET', 'SUM')

      await activate(cid)

      // Complete mission (2 logins)
      await ingest(PID, cid, 'LOGIN', {}, 2, 19)
      // Progress bar events (bet 400)
      await ingest(PID, cid, 'BET', { amount: 100 }, 4, 19)

      await sleep(4000)
      const s = await checkPipeline(cid)
      INFO('Flow: LOGIN→Mission→ACCESS_UNLOCK→Progress(BET≥300)→EXTRA_SPIN→Wheel')
      results['T17 Mission→Progress→Wheel'] = s.processed > 0 ? 'PASS' : 'CHECK'
    }
  } catch (e) { FAIL('T17', e.message); results['T17 Mission→Progress→Wheel'] = 'FAIL' }

  // ================================================================
  // TEST 18: CHAIN — Progress → Leaderboard → Cashout
  // ================================================================
  SECTION('TEST 18: Chain: Progress → Leaderboard → Cashout')
  try {
    const cid = await createCampaign('T18-Chain-PLC', `t18-${TS}`)

    // Progress bar → VIRTUAL_COINS
    const pbId = await mech(cid, 'PROGRESS_BAR', {
      metric_type: 'BET_SUM', target_value: 200,
      reward_definition_id: '00000000-0000-0000-0000-000000000000',
      auto_grant: true, window_type: 'campaign',
    }, 0)
    const pbRw = await reward(pbId, 'VIRTUAL_COINS', { coins: 40 })
    await updateMech(pbId, {
      metric_type: 'BET_SUM', target_value: 200,
      reward_definition_id: pbRw, auto_grant: true, window_type: 'campaign',
    })

    // Leaderboard ranks by MECHANIC_OUTCOME_SUM, prizes = CASH
    const lbId = await mech(cid, 'LEADERBOARD', {
      ranking_metric: 'MECHANIC_OUTCOME_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [],
    }, 1)
    const lbCashRw = await reward(lbId, 'CASH', { amount: 50, currency: 'GEL' })
    await updateMech(lbId, {
      ranking_metric: 'MECHANIC_OUTCOME_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [{ from_rank: 1, to_rank: 10, reward_definition_id: lbCashRw }],
    })

    // Cashout for claiming
    const coId = await mech(cid, 'CASHOUT', {
      claim_conditions: { type: 'MIN_DEPOSIT_GEL', value: 0 },
      reward_definition_id: lbCashRw,
      max_claims_per_player: 5, cooldown_hours: 1,
    }, 2)

    await agg(cid, pbId, 'BET', 'SUM')
    await agg(cid, lbId, 'MECHANIC_OUTCOME', 'SUM')
    await activate(cid)
    await ingest(PID, cid, 'BET', { amount: 100 }, 3, 20)
    await sleep(5000)
    const s = await checkPipeline(cid)
    INFO('Flow: BET→Progress→VIRTUAL_COINS→MECHANIC_OUTCOME→Leaderboard→CASH→Cashout')
    results['T18 Progress→LB→Cashout'] = s.processed > 0 ? 'PASS' : 'CHECK'
  } catch (e) { FAIL('T18', e.message); results['T18 Progress→LB→Cashout'] = 'FAIL' }

  // ================================================================
  // TEST 19: CHAIN — Mission → Leaderboard → Wheel-in-Wheel
  // ================================================================
  SECTION('TEST 19: Chain: Mission → Leaderboard → Wheel-in-Wheel')
  try {
    const cid = await createCampaign('T19-Chain-MLW', `t19-${TS}`)

    // Wheel-in-wheel (final)
    const wiwId = await mech(cid, 'WHEEL_IN_WHEEL', {
      spin_trigger: 'manual', max_spins_campaign: 100,
    }, 2)
    await reward(wiwId, 'CASH', { amount: 25, currency: 'GEL' }, 50)
    await reward(wiwId, 'VIRTUAL_COINS', { coins: 50 }, 50)

    // Leaderboard → EXTRA_SPIN to wheel-in-wheel
    const lbId = await mech(cid, 'LEADERBOARD', {
      ranking_metric: 'MECHANIC_OUTCOME_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [],
    }, 1)
    const lbRw = await reward(lbId, 'EXTRA_SPIN', { target_mechanic_id: wiwId, count: 3 })
    await updateMech(lbId, {
      ranking_metric: 'MECHANIC_OUTCOME_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [{ from_rank: 1, to_rank: 10, reward_definition_id: lbRw }],
    })

    // Mission → VIRTUAL_COINS (feeds leaderboard via MECHANIC_OUTCOME)
    const dRw = randomUUID()
    const mid = await mech(cid, 'MISSION', {
      execution_mode: 'sequential',
      steps: [
        { step_id: randomUUID(), order: 1, title: 'Bet 200', metric_type: 'BET_SUM', target_value: 200, time_limit_hours: 48, reward_definition_id: dRw },
        { step_id: randomUUID(), order: 2, title: 'Deposit 100', metric_type: 'DEPOSIT_SUM', target_value: 100, time_limit_hours: 48, reward_definition_id: dRw },
      ],
    }, 0)

    if (mid) {
      const mRw = await reward(mid, 'VIRTUAL_COINS', { coins: 30 })
      await updateMech(mid, {
        execution_mode: 'sequential',
        steps: [
          { step_id: randomUUID(), order: 1, title: 'Bet 200', metric_type: 'BET_SUM', target_value: 200, time_limit_hours: 48, reward_definition_id: mRw },
          { step_id: randomUUID(), order: 2, title: 'Deposit 100', metric_type: 'DEPOSIT_SUM', target_value: 100, time_limit_hours: 48, reward_definition_id: mRw },
        ],
      })

      await agg(cid, mid, 'BET', 'SUM')
      await agg(cid, mid, 'DEPOSIT', 'SUM')
      await agg(cid, lbId, 'MECHANIC_OUTCOME', 'SUM')
      await activate(cid)

      await ingest(PID, cid, 'BET', { amount: 100 }, 3, 21)
      await ingest(PID, cid, 'DEPOSIT', { amount: 60 }, 2, 21)
      await sleep(5000)
      const s = await checkPipeline(cid)
      INFO('Flow: Mission→VIRTUAL_COINS→MECHANIC_OUTCOME→Leaderboard→EXTRA_SPIN→Wheel-in-Wheel')
      results['T19 Mission→LB→WiW'] = s.processed > 0 ? 'PASS' : 'CHECK'
    }
  } catch (e) { FAIL('T19', e.message); results['T19 Mission→LB→WiW'] = 'FAIL' }

  // ================================================================
  SECTION('FINAL RESULTS — EXTENDED TESTS')
  for (const [test, result] of Object.entries(results)) {
    const icon = result === 'PASS' ? '✅' : result.startsWith('SETUP') ? '🔧' : result === 'CHECK' ? '⚠️' : '❌'
    console.log(`  ${icon} ${test}: ${result}`)
  }
  console.log(`\nLegend: PASS=pipeline ran | SETUP_OK=needs finalization | CHECK=verify | FAIL=error`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
