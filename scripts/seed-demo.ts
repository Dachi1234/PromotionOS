#!/usr/bin/env tsx

const ENGINE_URL = process.env.ENGINE_URL ?? 'http://localhost:3000'
let JWT = ''

async function api(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (JWT) headers['Authorization'] = `Bearer ${JWT}`
  const res = await fetch(`${ENGINE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.success && res.status !== 409) {
    console.error(`  [FAIL] ${method} ${path}:`, json.error?.message ?? res.status)
    return null
  }
  return json.data
}

async function publicApi(method: string, path: string, sessionToken: string, body?: unknown) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken,
  }
  const res = await fetch(`${ENGINE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  return json.data
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log(`\n🎰 PromotionOS Demo Seed`)
  console.log(`   Engine: ${ENGINE_URL}\n`)

  // Step 1: Login as admin
  console.log('1. Authenticating...')
  const authData = await api('POST', '/api/v1/admin/auth/login', {
    email: 'admin@promotionos.dev',
    password: 'admin123',
  })
  if (!authData?.token) {
    console.error('   Failed to authenticate. Is the engine running?')
    process.exit(1)
  }
  JWT = authData.token
  console.log('   Logged in as admin')

  // Step 2: Create mock players
  console.log('\n2. Creating mock players...')
  const vipTiers = ['bronze', 'silver', 'gold', 'platinum']
  const tags = ['high_roller', 'new_player', 'slots_fan', 'live_casino_fan']
  const players: { id: string; externalId: string; token: string }[] = []

  for (let i = 1; i <= 50; i++) {
    const externalId = `demo-player-${String(i).padStart(3, '0')}`
    const existing = await api('GET', `/api/v1/admin/players?externalId=${externalId}`)
    if (existing?.players?.length > 0) {
      const p = existing.players[0]
      const session = await api('POST', `/api/v1/admin/players/${p.id}/session`)
      players.push({ id: p.id, externalId, token: session?.sessionToken ?? '' })
      continue
    }

    const depositAmount = randomBetween(0, 50000)
    const daysAgo = randomBetween(1, 365)
    const data = await api('POST', '/api/v1/admin/players', {
      externalId,
      displayName: `Player ${i}`,
      attributes: {
        vipTier: vipTiers[i % 4],
        tags: [tags[i % 4]],
        totalDeposits: depositAmount,
        registeredAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      },
    })
    if (data?.player) {
      const session = await api('POST', `/api/v1/admin/players/${data.player.id}/session`)
      players.push({ id: data.player.id, externalId, token: session?.sessionToken ?? '' })
    }
  }
  console.log(`   Created/found ${players.length} players`)

  // Step 3: Create Campaign 1 - Summer Slots Festival
  console.log('\n3. Creating campaigns...')

  const startsAt = new Date()
  const endsAt = new Date(Date.now() + 14 * 86400000)

  const c1 = await api('POST', '/api/v1/admin/campaigns', {
    name: 'Summer Slots Festival',
    slug: 'summer-slots-festival',
    description: 'Spin the wheel and climb the leaderboard in our biggest slots promotion!',
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    currency: 'GEL',
  })
  const campaign1Id = c1?.campaign?.id
  if (campaign1Id) {
    console.log(`   Campaign 1: ${campaign1Id}`)

    // Add wheel mechanic
    const wheel = await api('POST', `/api/v1/admin/campaigns/${campaign1Id}/mechanics`, {
      type: 'WHEEL',
      label: 'Lucky Wheel',
      config: { sliceCount: 6, spinsPerDay: 3 },
      visualConfig: {
        colors: ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#ec4899'],
        labels: ['Free Spins', 'Cash', 'Multiplier', 'Extra Spin', 'Cashback', 'Prize'],
      },
    })
    if (wheel?.mechanic) {
      // Add reward definitions for wheel slices
      const slices = [
        { type: 'FREE_SPINS', weight: 35, value: { spins: 10 } },
        { type: 'CASH', weight: 25, value: { amount: 5 } },
        { type: 'MULTIPLIER', weight: 15, value: { multiplier: 2 } },
        { type: 'FREE_SPINS', weight: 10, value: { spins: 1, isExtraSpin: true } },
        { type: 'CASHBACK', weight: 10, value: { percentage: 10 } },
        { type: 'PHYSICAL', weight: 5, value: { item: 'iPhone 16' } },
      ]
      for (const slice of slices) {
        await api('POST', `/api/v1/admin/campaigns/${campaign1Id}/reward-definitions`, {
          mechanicId: wheel.mechanic.id,
          type: slice.type,
          value: slice.value,
          weight: slice.weight,
        })
      }

      // Add aggregation rule for wheel
      await api('POST', `/api/v1/admin/campaigns/${campaign1Id}/aggregation-rules`, {
        mechanicId: wheel.mechanic.id,
        sourceEvent: 'BET',
        metric: 'COUNT',
        window: 'CAMPAIGN',
        transformation: [],
      })
    }

    // Add leaderboard mechanic
    const lb = await api('POST', `/api/v1/admin/campaigns/${campaign1Id}/mechanics`, {
      type: 'LEADERBOARD',
      label: 'Slots Leaderboard',
      config: { refreshInterval: 300, prizeCount: 10 },
    })
    if (lb?.mechanic) {
      // Add prizes for top 3
      for (let rank = 1; rank <= 3; rank++) {
        await api('POST', `/api/v1/admin/campaigns/${campaign1Id}/reward-definitions`, {
          mechanicId: lb.mechanic.id,
          type: 'CASH',
          value: { amount: [1000, 500, 250][rank - 1] },
          rankRange: { from: rank, to: rank },
        })
      }

      // Add aggregation rule for leaderboard
      await api('POST', `/api/v1/admin/campaigns/${campaign1Id}/aggregation-rules`, {
        mechanicId: lb.mechanic.id,
        sourceEvent: 'BET',
        metric: 'SUM',
        field: 'amount',
        window: 'CAMPAIGN',
        transformation: [{ operation: 'PERCENTAGE', parameter: 30 }],
      })
    }

    // Activate campaign 1
    await api('PUT', `/api/v1/admin/campaigns/${campaign1Id}/status`, { status: 'active' })
    console.log('   Campaign 1 activated')
  }

  // Step 4: Campaign 2 - VIP Weekly Challenge
  const c2start = new Date(Date.now() + 86400000)
  const c2end = new Date(Date.now() + 8 * 86400000)
  const c2 = await api('POST', '/api/v1/admin/campaigns', {
    name: 'VIP Weekly Challenge',
    slug: 'vip-weekly-challenge',
    description: 'Complete missions to earn exclusive VIP rewards.',
    startsAt: c2start.toISOString(),
    endsAt: c2end.toISOString(),
    currency: 'GEL',
  })
  const campaign2Id = c2?.campaign?.id
  if (campaign2Id) {
    console.log(`   Campaign 2: ${campaign2Id} (scheduled)`)

    await api('POST', `/api/v1/admin/campaigns/${campaign2Id}/mechanics`, {
      type: 'MISSION',
      label: 'VIP Missions',
      config: {
        mode: 'sequential',
        steps: [
          { title: 'Bet 1000 GEL', target: 1000 },
          { title: 'Deposit 500 GEL', target: 500 },
          { title: 'Win 5 games', target: 5 },
        ],
      },
    })

    await api('POST', `/api/v1/admin/campaigns/${campaign2Id}/mechanics`, {
      type: 'PROGRESS_BAR',
      label: 'Bet Progress',
      config: { target: 5000, autoGrant: false },
    })

    await api('PUT', `/api/v1/admin/campaigns/${campaign2Id}/status`, { status: 'scheduled' })
  }

  // Step 5: Campaign 3 - New Player Welcome
  const c3 = await api('POST', '/api/v1/admin/campaigns', {
    name: 'New Player Welcome',
    slug: 'new-player-welcome',
    description: 'Welcome bonus with special wheel and cashout conditions.',
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    currency: 'GEL',
  })
  const campaign3Id = c3?.campaign?.id
  if (campaign3Id) {
    console.log(`   Campaign 3: ${campaign3Id}`)

    await api('POST', `/api/v1/admin/campaigns/${campaign3Id}/mechanics`, {
      type: 'WHEEL_IN_WHEEL',
      label: 'Welcome Wheel',
      config: { sliceCount: 4, spinsPerDay: 1 },
      visualConfig: {
        colors: ['#7c3aed', '#059669', '#d97706', '#2563eb'],
        labels: ['Cash', 'Deposit Gate', 'Free Spins', 'Bet Gate'],
      },
    })

    await api('PUT', `/api/v1/admin/campaigns/${campaign3Id}/status`, { status: 'active' })
    console.log('   Campaign 3 activated')
  }

  // Step 6: Ingest events for active campaigns
  console.log('\n4. Ingesting events...')
  const activeCampaigns = [campaign1Id, campaign3Id].filter(Boolean) as string[]
  let eventCount = 0

  for (const campaignId of activeCampaigns) {
    for (let i = 0; i < 30 && i < players.length; i++) {
      const player = players[i]
      if (!player.token) continue

      // BET events
      const betCount = randomBetween(5, 20)
      for (let b = 0; b < betCount; b++) {
        await publicApi('POST', '/api/v1/events/ingest', player.token, {
          eventType: 'BET',
          campaignId,
          payload: {
            amount: randomBetween(1, 500),
            gameCategory: 'slots',
            gameId: `slot-${randomBetween(1, 10)}`,
          },
        })
        eventCount++
      }

      // DEPOSIT events
      const depositCount = randomBetween(1, 5)
      for (let d = 0; d < depositCount; d++) {
        await publicApi('POST', '/api/v1/events/ingest', player.token, {
          eventType: 'DEPOSIT',
          campaignId,
          payload: {
            amount: randomBetween(50, 1000),
            method: 'card',
          },
        })
        eventCount++
      }
    }
  }
  console.log(`   Ingested ${eventCount} events`)

  // Step 7: Execute some wheel spins
  console.log('\n5. Executing wheel spins...')
  let spinCount = 0
  if (campaign1Id) {
    for (let i = 0; i < 10 && i < players.length; i++) {
      const player = players[i]
      if (!player.token) continue
      for (let s = 0; s < 2; s++) {
        await publicApi('POST', `/api/v1/campaigns/${campaign1Id}/spin`, player.token, {})
        spinCount++
      }
    }
  }
  console.log(`   Executed ${spinCount} spins`)

  // Summary
  console.log('\n✅ Seed complete!')
  console.log(`   Players: ${players.length}`)
  console.log(`   Campaigns: 3`)
  console.log(`   Events: ${eventCount}`)
  console.log(`   Spins: ${spinCount}`)

  if (players.length > 0) {
    console.log(`\n📋 Quick access:`)
    console.log(`   Studio:  http://localhost:3001`)
    console.log(`   Canvas runtime: http://localhost:3002/summer-slots-festival?token=${players[0].token}`)
    console.log(`   Canvas builder: http://localhost:3002/builder/${campaign1Id}`)
    console.log(`   First player token: ${players[0].token}`)
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
