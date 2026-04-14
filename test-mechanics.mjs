// PromotionOS Backend Integration Tests v2
// Tests all mechanic combinations from the matrix
// Fixed: correct Zod schemas for leaderboard, mission, cashout

import { randomUUID } from 'crypto'

const BASE = 'http://localhost:3000'
let ADMIN_TOKEN = ''
const TS = Date.now()

const PASS = (msg) => console.log(`\x1b[32m✅ PASS: ${msg}\x1b[0m`)
const FAIL = (msg, resp) => { console.log(`\x1b[31m❌ FAIL: ${msg}\x1b[0m`); console.log(`  ${JSON.stringify(resp).slice(0, 400)}`)}
const INFO = (msg) => console.log(`\x1b[33m→ ${msg}\x1b[0m`)
const SECTION = (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`)

async function api(method, path, body, headers = {}) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (body) opts.body = JSON.stringify(body)
  const resp = await fetch(`${BASE}${path}`, opts)
  return resp.json()
}

async function adminApi(method, path, body) {
  return api(method, path, body, { Authorization: `Bearer ${ADMIN_TOKEN}` })
}

async function createCampaign(name, slug) {
  const r = await adminApi('POST', '/api/v1/admin/campaigns', {
    name, slug, startsAt: '2026-04-01T00:00:00Z', endsAt: '2026-05-30T23:59:59Z',
  })
  if (!r.data?.campaign?.id) { FAIL(`Create campaign "${name}"`, r); return null }
  PASS(`Created campaign: ${name}`)
  return r.data.campaign.id
}

async function createMechanic(cid, type, config, order = 0) {
  const r = await adminApi('POST', `/api/v1/admin/campaigns/${cid}/mechanics`, {
    type, config, displayOrder: order, isActive: true,
  })
  if (!r.data?.id) { FAIL(`Create ${type}`, r); return null }
  PASS(`Created ${type}`)
  return r.data.id
}

async function updateMechanic(id, config) {
  return adminApi('PUT', `/api/v1/admin/mechanics/${id}`, { config })
}

async function createReward(mechId, type, config, weight = 100) {
  const r = await adminApi('POST', `/api/v1/admin/mechanics/${mechId}/reward-definitions`, {
    type, config, probabilityWeight: weight,
  })
  if (!r.data?.id) { FAIL(`Create ${type} reward`, r); return null }
  PASS(`Created ${type} reward`)
  return r.data.id
}

async function createAgg(cid, mechId, src, metric, win = 'campaign', field = 'amount') {
  const r = await adminApi('POST', `/api/v1/admin/campaigns/${cid}/aggregation-rules`, {
    mechanicId: mechId, sourceEventType: src, metric,
    transformation: { operation: 'NONE', field }, windowType: win,
  })
  if (!r.data?.id) { FAIL(`Create ${src}_${metric} agg`, r); return null }
  PASS(`Created ${src}_${metric} aggregation`)
  return r.data.id
}

async function activate(cid) {
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
  PASS(`Ingested ${count} ${type} events`)
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
  const lr = await api('POST', '/api/v1/admin/auth/login', {
    email: 'admin@promotionos.dev', password: 'admin123',
  })
  ADMIN_TOKEN = lr.data?.token
  if (!ADMIN_TOKEN) { FAIL('Login', lr); process.exit(1) }
  PASS('Admin login')

  const er = await adminApi('GET', '/api/v1/admin/events?page=1&limit=1')
  const PID = er.data?.events?.[0]?.playerId
  INFO(`Player: ${PID}`)

  const results = {}

  // ================================================================
  // TEST 1: Progress Bar → Wheel (EXTRA_SPIN)
  // ================================================================
  SECTION('TEST 1: Progress Bar → Wheel (EXTRA_SPIN)')
  try {
    const cid = await createCampaign('T1-ProgressWheel', `t1-${TS}`)
    const wid = await createMechanic(cid, 'WHEEL', { spin_trigger: 'manual', max_spins_campaign: 100, max_spins_per_day: 50 }, 1)
    await createReward(wid, 'VIRTUAL_COINS', { coins: 10 }, 50)
    await createReward(wid, 'VIRTUAL_COINS', { coins: 20 }, 50)

    const pid = await createMechanic(cid, 'PROGRESS_BAR', {
      metric_type: 'BET_SUM', target_value: 500,
      reward_definition_id: '00000000-0000-0000-0000-000000000000',
      auto_grant: true, window_type: 'campaign',
    }, 0)

    const rwid = await createReward(pid, 'EXTRA_SPIN', { target_mechanic_id: wid, count: 3 })
    await updateMechanic(pid, {
      metric_type: 'BET_SUM', target_value: 500,
      reward_definition_id: rwid, auto_grant: true, window_type: 'campaign',
    })

    await createAgg(cid, pid, 'BET', 'SUM')
    await activate(cid)
    await ingest(PID, cid, 'BET', { amount: 100 }, 6, 10)
    await sleep(4000)
    const s = await checkPipeline(cid)
    results['T1 Progress→Wheel'] = s.processed > 0 ? 'PASS' : 'CHECK'
  } catch (e) { FAIL('T1', e.message); results['T1 Progress→Wheel'] = 'FAIL' }

  // ================================================================
  // TEST 2: Progress Bar → Leaderboard (MECHANIC_OUTCOME)
  // ================================================================
  SECTION('TEST 2: Progress Bar → Leaderboard (MECHANIC_OUTCOME)')
  try {
    const cid = await createCampaign('T2-ProgressLB', `t2-${TS}`)
    const pid = await createMechanic(cid, 'PROGRESS_BAR', {
      metric_type: 'BET_SUM', target_value: 200,
      reward_definition_id: '00000000-0000-0000-0000-000000000000',
      auto_grant: true, window_type: 'campaign',
    }, 0)
    // Leaderboard with empty prize_distribution
    const lid = await createMechanic(cid, 'LEADERBOARD', {
      ranking_metric: 'MECHANIC_OUTCOME_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 100,
      prize_distribution: [],
    }, 1)

    const rwid = await createReward(pid, 'VIRTUAL_COINS', { coins: 50 })
    await updateMechanic(pid, {
      metric_type: 'BET_SUM', target_value: 200,
      reward_definition_id: rwid, auto_grant: true, window_type: 'campaign',
    })

    await createAgg(cid, pid, 'BET', 'SUM')
    await createAgg(cid, lid, 'MECHANIC_OUTCOME', 'SUM')
    await activate(cid)
    await ingest(PID, cid, 'BET', { amount: 100 }, 3, 11)
    await sleep(5000)
    INFO('Checking MECHANIC_OUTCOME propagation...')
    const s = await checkPipeline(cid)
    results['T2 Progress→Leaderboard'] = s.processed > 0 ? 'PASS' : 'CHECK'
  } catch (e) { FAIL('T2', e.message); results['T2 Progress→Leaderboard'] = 'FAIL' }

  // ================================================================
  // TEST 3: Wheel → Leaderboard (MECHANIC_OUTCOME)
  // ================================================================
  SECTION('TEST 3: Wheel → Leaderboard (MECHANIC_OUTCOME) — Setup Only')
  try {
    const cid = await createCampaign('T3-WheelLB', `t3-${TS}`)
    const wid = await createMechanic(cid, 'WHEEL', { spin_trigger: 'manual', max_spins_campaign: 100 }, 0)
    const lid = await createMechanic(cid, 'LEADERBOARD', {
      ranking_metric: 'MECHANIC_OUTCOME_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [],
    }, 1)
    await createReward(wid, 'VIRTUAL_COINS', { coins: 25 }, 50)
    await createReward(wid, 'VIRTUAL_COINS', { coins: 100 }, 25)
    await createReward(wid, 'FREE_SPINS', { count: 5, gameId: 'slot' }, 25)
    await createAgg(cid, lid, 'MECHANIC_OUTCOME', 'SUM')
    await activate(cid)
    INFO('Ready — needs player spin to test')
    results['T3 Wheel→Leaderboard'] = 'SETUP_OK'
  } catch (e) { FAIL('T3', e.message); results['T3 Wheel→Leaderboard'] = 'FAIL' }

  // ================================================================
  // TEST 4: Mission (Sequential) → Wheel (EXTRA_SPIN)
  // ================================================================
  SECTION('TEST 4: Mission → Wheel (EXTRA_SPIN)')
  try {
    const cid = await createCampaign('T4-MissionWheel', `t4-${TS}`)
    const wid = await createMechanic(cid, 'WHEEL', { spin_trigger: 'manual', max_spins_campaign: 100 }, 1)
    await createReward(wid, 'VIRTUAL_COINS', { coins: 15 })

    // Create a dummy reward ID for step references (will create real one after mission)
    const dummyRwId = randomUUID()

    const mid = await createMechanic(cid, 'MISSION', {
      execution_mode: 'sequential',
      steps: [
        { step_id: randomUUID(), order: 1, title: 'Bet 100 GEL', metric_type: 'BET_SUM', target_value: 100, time_limit_hours: 48, reward_definition_id: dummyRwId },
        { step_id: randomUUID(), order: 2, title: 'Deposit 50 GEL', metric_type: 'DEPOSIT_SUM', target_value: 50, time_limit_hours: 48, reward_definition_id: dummyRwId },
      ],
    }, 0)

    if (mid) {
      const rwid = await createReward(mid, 'EXTRA_SPIN', { target_mechanic_id: wid, count: 2 })
      // Update mission steps with real reward ID
      await updateMechanic(mid, {
        execution_mode: 'sequential',
        steps: [
          { step_id: randomUUID(), order: 1, title: 'Bet 100 GEL', metric_type: 'BET_SUM', target_value: 100, time_limit_hours: 48, reward_definition_id: rwid },
          { step_id: randomUUID(), order: 2, title: 'Deposit 50 GEL', metric_type: 'DEPOSIT_SUM', target_value: 50, time_limit_hours: 48, reward_definition_id: rwid },
        ],
      })
      INFO('Updated mission steps with real reward ID')

      await createAgg(cid, mid, 'BET', 'SUM')
      await createAgg(cid, mid, 'DEPOSIT', 'SUM')
      await activate(cid)
      await ingest(PID, cid, 'BET', { amount: 60 }, 2, 12)
      await ingest(PID, cid, 'DEPOSIT', { amount: 60 }, 1, 12)
      await sleep(4000)
      const s = await checkPipeline(cid)
      results['T4 Mission→Wheel'] = s.processed > 0 ? 'PASS' : 'CHECK'
    } else {
      results['T4 Mission→Wheel'] = 'FAIL'
    }
  } catch (e) { FAIL('T4', e.message); results['T4 Mission→Wheel'] = 'FAIL' }

  // ================================================================
  // TEST 5: Leaderboard → Wheel (finalization → EXTRA_SPIN)
  // ================================================================
  SECTION('TEST 5: Leaderboard → Wheel (finalization → EXTRA_SPIN)')
  try {
    const cid = await createCampaign('T5-LBWheel', `t5-${TS}`)
    const wid = await createMechanic(cid, 'WHEEL', { spin_trigger: 'manual', max_spins_campaign: 100 }, 1)
    await createReward(wid, 'VIRTUAL_COINS', { coins: 10 })

    // Create leaderboard with empty prizes first
    const lid = await createMechanic(cid, 'LEADERBOARD', {
      ranking_metric: 'BET_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [],
    }, 0)

    // Create prize reward on leaderboard
    const lrw = await createReward(lid, 'EXTRA_SPIN', { target_mechanic_id: wid, count: 5 })

    // Update leaderboard with prize dist
    await updateMechanic(lid, {
      ranking_metric: 'BET_SUM', window_type: 'campaign',
      tie_breaking: 'first_to_reach', max_displayed_ranks: 50,
      prize_distribution: [{ from_rank: 1, to_rank: 10, reward_definition_id: lrw }],
    })
    INFO('Updated leaderboard with prize distribution')

    await createAgg(cid, lid, 'BET', 'SUM')
    await activate(cid)
    await ingest(PID, cid, 'BET', { amount: 200 }, 5, 13)
    await sleep(3000)
    const s = await checkPipeline(cid)
    INFO('Prizes awarded on finalization only')
    results['T5 Leaderboard→Wheel'] = s.processed > 0 ? 'SETUP_OK' : 'CHECK'
  } catch (e) { FAIL('T5', e.message); results['T5 Leaderboard→Wheel'] = 'FAIL' }

  // ================================================================
  // TEST 6: Progress Bar → Cashout (CASH)
  // ================================================================
  SECTION('TEST 6: Progress Bar → Cashout (CASH)')
  try {
    const cid = await createCampaign('T6-ProgressCash', `t6-${TS}`)
    const pbid = await createMechanic(cid, 'PROGRESS_BAR', {
      metric_type: 'DEPOSIT_SUM', target_value: 100,
      reward_definition_id: '00000000-0000-0000-0000-000000000000',
      auto_grant: true, window_type: 'campaign',
    }, 0)

    const rwid = await createReward(pbid, 'CASH', { amount: 25, currency: 'GEL' })
    await updateMechanic(pbid, {
      metric_type: 'DEPOSIT_SUM', target_value: 100,
      reward_definition_id: rwid, auto_grant: true, window_type: 'campaign',
    })

    // Cashout needs: claim_conditions, reward_definition_id
    // Create a cashout reward first
    const coid = await createMechanic(cid, 'CASHOUT', {
      claim_conditions: { type: 'MIN_DEPOSIT_GEL', value: 0 },
      reward_definition_id: rwid,  // reuse — cashout claims from accumulated rewards
      max_claims_per_player: 10,
      cooldown_hours: 1,
    }, 1)

    await createAgg(cid, pbid, 'DEPOSIT', 'SUM')
    await activate(cid)
    await ingest(PID, cid, 'DEPOSIT', { amount: 60 }, 2, 14)
    await sleep(4000)
    const s = await checkPipeline(cid)
    results['T6 Progress→Cashout'] = s.processed > 0 ? 'PASS' : 'CHECK'
  } catch (e) { FAIL('T6', e.message); results['T6 Progress→Cashout'] = 'FAIL' }

  // ================================================================
  // TEST 7: Mission → Cashout (CASH)
  // ================================================================
  SECTION('TEST 7: Mission → Cashout (CASH)')
  try {
    const cid = await createCampaign('T7-MissionCash', `t7-${TS}`)
    const dummyRw = randomUUID()

    const mid = await createMechanic(cid, 'MISSION', {
      execution_mode: 'sequential',
      steps: [
        { step_id: randomUUID(), order: 1, title: 'Login 3 times', metric_type: 'LOGIN_COUNT', target_value: 3, time_limit_hours: 48, reward_definition_id: dummyRw },
      ],
    }, 0)

    if (mid) {
      const mrw = await createReward(mid, 'CASH', { amount: 10, currency: 'GEL' })
      // Update with real reward ID
      await updateMechanic(mid, {
        execution_mode: 'sequential',
        steps: [
          { step_id: randomUUID(), order: 1, title: 'Login 3 times', metric_type: 'LOGIN_COUNT', target_value: 3, time_limit_hours: 48, reward_definition_id: mrw },
        ],
      })

      // Cashout
      const coid = await createMechanic(cid, 'CASHOUT', {
        claim_conditions: { type: 'MIN_DEPOSIT_GEL', value: 0 },
        reward_definition_id: mrw,
        max_claims_per_player: 5,
        cooldown_hours: 1,
      }, 1)

      await createAgg(cid, mid, 'LOGIN', 'COUNT')
      await activate(cid)
      await ingest(PID, cid, 'LOGIN', {}, 3, 15)
      await sleep(4000)
      const s = await checkPipeline(cid)
      results['T7 Mission→Cashout'] = s.processed > 0 ? 'PASS' : 'CHECK'
    } else {
      results['T7 Mission→Cashout'] = 'FAIL'
    }
  } catch (e) { FAIL('T7', e.message); results['T7 Mission→Cashout'] = 'FAIL' }

  // ================================================================
  SECTION('FINAL RESULTS')
  for (const [test, result] of Object.entries(results)) {
    const icon = result === 'PASS' ? '✅' : result.startsWith('SETUP') ? '🔧' : result === 'CHECK' ? '⚠️' : '❌'
    console.log(`  ${icon} ${test}: ${result}`)
  }
  console.log(`\nLegend: PASS=pipeline ran | SETUP_OK=needs player interaction | CHECK=verify | FAIL=error`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
