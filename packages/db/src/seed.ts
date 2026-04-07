import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import * as schema from './index'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const client = postgres(process.env.DATABASE_URL)
const db = drizzle(client, { schema })

const georgianPlayers: Array<{
  externalId: string
  displayName: string
  email: string
  segmentTags: string[]
  vipTier: 'bronze' | 'silver' | 'gold' | 'platinum'
  totalDepositsGel: string
  registrationDate: Date
}> = [
  {
    externalId: 'odds_001',
    displayName: 'Giorgi Beridze',
    email: 'giorgi.beridze@example.ge',
    segmentTags: ['high_roller', 'vip'],
    vipTier: 'platinum',
    totalDepositsGel: '15000.00',
    registrationDate: new Date('2021-03-15'),
  },
  {
    externalId: 'odds_002',
    displayName: 'Nino Kvaratskhelia',
    email: 'nino.kv@example.ge',
    segmentTags: ['slots_player', 'active'],
    vipTier: 'gold',
    totalDepositsGel: '4200.00',
    registrationDate: new Date('2022-07-22'),
  },
  {
    externalId: 'odds_003',
    displayName: 'Luka Tabatadze',
    email: 'luka.tab@example.ge',
    segmentTags: ['new_player'],
    vipTier: 'bronze',
    totalDepositsGel: '150.00',
    registrationDate: new Date('2025-11-01'),
  },
  {
    externalId: 'odds_004',
    displayName: 'Mariam Gelashvili',
    email: 'mariam.gel@example.ge',
    segmentTags: ['sports_bettor', 'at_risk'],
    vipTier: 'silver',
    totalDepositsGel: '890.00',
    registrationDate: new Date('2023-04-10'),
  },
  {
    externalId: 'odds_005',
    displayName: 'Davit Jikia',
    email: 'davit.jik@example.ge',
    segmentTags: ['high_roller', 'slots_player'],
    vipTier: 'gold',
    totalDepositsGel: '7500.00',
    registrationDate: new Date('2020-09-05'),
  },
  {
    externalId: 'odds_006',
    displayName: 'Tamar Mikhelidze',
    email: 'tamar.mik@example.ge',
    segmentTags: ['inactive'],
    vipTier: 'bronze',
    totalDepositsGel: '50.00',
    registrationDate: new Date('2022-01-18'),
  },
  {
    externalId: 'odds_007',
    displayName: 'Irakli Lomidze',
    email: 'irakli.lom@example.ge',
    segmentTags: ['vip', 'sports_bettor'],
    vipTier: 'platinum',
    totalDepositsGel: '22000.00',
    registrationDate: new Date('2019-06-30'),
  },
  {
    externalId: 'odds_008',
    displayName: 'Salome Tsiklauri',
    email: 'salome.tsi@example.ge',
    segmentTags: ['slots_player', 'new_player'],
    vipTier: 'bronze',
    totalDepositsGel: '320.00',
    registrationDate: new Date('2025-10-15'),
  },
  {
    externalId: 'odds_009',
    displayName: 'Nikoloz Chikvanaia',
    email: 'nikoloz.ch@example.ge',
    segmentTags: ['at_risk', 'inactive'],
    vipTier: 'silver',
    totalDepositsGel: '1100.00',
    registrationDate: new Date('2021-11-25'),
  },
  {
    externalId: 'odds_010',
    displayName: 'Ekaterine Gogua',
    email: 'ekaterine.go@example.ge',
    segmentTags: ['high_roller'],
    vipTier: 'gold',
    totalDepositsGel: '9800.00',
    registrationDate: new Date('2020-03-14'),
  },
  {
    externalId: 'odds_011',
    displayName: 'Tornike Basilaia',
    email: 'tornike.bas@example.ge',
    segmentTags: ['sports_bettor'],
    vipTier: 'silver',
    totalDepositsGel: '2300.00',
    registrationDate: new Date('2023-08-08'),
  },
  {
    externalId: 'odds_012',
    displayName: 'Ana Kereselidze',
    email: 'ana.ker@example.ge',
    segmentTags: ['slots_player', 'vip'],
    vipTier: 'gold',
    totalDepositsGel: '5600.00',
    registrationDate: new Date('2021-05-19'),
  },
  {
    externalId: 'odds_013',
    displayName: 'Sandro Mchedlishvili',
    email: 'sandro.mch@example.ge',
    segmentTags: ['new_player', 'sports_bettor'],
    vipTier: 'bronze',
    totalDepositsGel: '210.00',
    registrationDate: new Date('2025-12-01'),
  },
  {
    externalId: 'odds_014',
    displayName: 'Natia Kapanadze',
    email: 'natia.kap@example.ge',
    segmentTags: ['inactive', 'at_risk'],
    vipTier: 'bronze',
    totalDepositsGel: '75.00',
    registrationDate: new Date('2022-10-30'),
  },
  {
    externalId: 'odds_015',
    displayName: 'Giorgi Abashidze',
    email: 'giorgi.aba@example.ge',
    segmentTags: ['high_roller', 'slots_player', 'vip'],
    vipTier: 'platinum',
    totalDepositsGel: '31000.00',
    registrationDate: new Date('2018-12-10'),
  },
  {
    externalId: 'odds_016',
    displayName: 'Ketevan Jgerenaia',
    email: 'ketevan.jg@example.ge',
    segmentTags: ['sports_bettor', 'active'],
    vipTier: 'silver',
    totalDepositsGel: '1750.00',
    registrationDate: new Date('2023-02-14'),
  },
  {
    externalId: 'odds_017',
    displayName: 'Beka Khutsishvili',
    email: 'beka.khu@example.ge',
    segmentTags: ['at_risk'],
    vipTier: 'bronze',
    totalDepositsGel: '430.00',
    registrationDate: new Date('2022-06-03'),
  },
  {
    externalId: 'odds_018',
    displayName: 'Maka Gogiberidze',
    email: 'maka.gog@example.ge',
    segmentTags: ['slots_player', 'high_roller'],
    vipTier: 'gold',
    totalDepositsGel: '6700.00',
    registrationDate: new Date('2020-08-22'),
  },
  {
    externalId: 'odds_019',
    displayName: 'Levan Shengelia',
    email: 'levan.she@example.ge',
    segmentTags: ['vip', 'sports_bettor'],
    vipTier: 'platinum',
    totalDepositsGel: '18500.00',
    registrationDate: new Date('2019-04-17'),
  },
  {
    externalId: 'odds_020',
    displayName: 'Nana Tvauri',
    email: 'nana.tva@example.ge',
    segmentTags: ['inactive', 'new_player'],
    vipTier: 'bronze',
    totalDepositsGel: '25.00',
    registrationDate: new Date('2025-09-05'),
  },
]

async function seed(): Promise<void> {
  console.log('🌱 Starting seed...')

  // 1. Seed studio user
  const passwordHash = await bcrypt.hash('admin123', 12)
  const [adminUser] = await db
    .insert(schema.studioUsers)
    .values({
      email: 'admin@promotionos.dev',
      passwordHash,
      role: 'admin',
    })
    .onConflictDoNothing()
    .returning()

  console.log(`✓ Studio user seeded: ${adminUser?.email ?? 'already exists'}`)

  // 2. Seed mock players
  const insertedPlayers = await db
    .insert(schema.mockPlayers)
    .values(georgianPlayers)
    .onConflictDoNothing()
    .returning()

  console.log(`✓ ${insertedPlayers.length} players seeded`)

  // Re-fetch all players in case some already existed
  const allPlayers = await db.select().from(schema.mockPlayers)

  // 3. Seed sessions for each player
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  const sessionValues = allPlayers.flatMap((player) => [
    {
      playerId: player.id,
      token: `valid-${player.externalId}-${Date.now()}`,
      expiresAt: sevenDaysFromNow,
    },
    {
      playerId: player.id,
      token: `expired-${player.externalId}-${Date.now()}`,
      expiresAt: twoDaysAgo,
    },
  ])

  await db.insert(schema.mockSessions).values(sessionValues).onConflictDoNothing()
  console.log(`✓ ${sessionValues.length} sessions seeded (${allPlayers.length} valid + ${allPlayers.length} expired)`)

  // Need a studio user id for created_by
  const studioUser =
    adminUser ??
    (await db.select().from(schema.studioUsers).limit(1)).at(0)

  if (!studioUser) {
    throw new Error('Studio user not found after seeding')
  }

  // 4. Seed campaigns
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const campaignData = [
    {
      name: 'Summer Spin Bonanza',
      slug: 'summer-spin-bonanza',
      description: 'A classic wheel spin campaign for the summer season.',
      status: 'draft' as const,
      currency: 'GEL',
      startsAt: tomorrow,
      endsAt: thirtyDaysFromNow,
      createdBy: studioUser.id,
    },
    {
      name: 'Weekly Leaderboard Challenge',
      slug: 'weekly-leaderboard-challenge',
      description: 'Compete on the weekly leaderboard for top prizes.',
      status: 'scheduled' as const,
      currency: 'GEL',
      startsAt: tomorrow,
      endsAt: thirtyDaysFromNow,
      createdBy: studioUser.id,
    },
    {
      name: 'Loyalty Mission Week',
      slug: 'loyalty-mission-week',
      description: 'Complete loyalty missions to earn exclusive rewards.',
      status: 'active' as const,
      currency: 'GEL',
      startsAt: threeDaysAgo,
      endsAt: thirtyDaysFromNow,
      createdBy: studioUser.id,
    },
  ]

  const insertedCampaigns = await db
    .insert(schema.campaigns)
    .values(campaignData)
    .onConflictDoNothing()
    .returning()

  console.log(`✓ ${insertedCampaigns.length} campaigns seeded`)

  // Re-fetch campaigns in case some already existed
  const allCampaigns = await db.select().from(schema.campaigns)

  // 5. Seed mechanics for each campaign
  for (const campaign of allCampaigns) {
    const mechanicsData = [
      {
        campaignId: campaign.id,
        type: 'WHEEL' as const,
        config: {
          slices: 8,
          spinLimit: { total: null, perDay: 1, perPlayer: 10 },
          spinTrigger: 'manual',
        },
        displayOrder: 0,
        isActive: true,
      },
      {
        campaignId: campaign.id,
        type: 'LEADERBOARD' as const,
        config: {
          rankingMetric: 'bet_count',
          windowType: 'weekly',
          topPrizes: 10,
          tieBreakerRule: 'earliest_first',
        },
        displayOrder: 1,
        isActive: true,
      },
    ]

    const insertedMechanics = await db
      .insert(schema.mechanics)
      .values(mechanicsData)
      .returning()

    // Create campaign_mechanics join records
    await db.insert(schema.campaignMechanics).values(
      insertedMechanics.map((mechanic, idx) => ({
        campaignId: campaign.id,
        mechanicId: mechanic.id,
        orderIndex: idx,
        role: 'primary' as const,
      })),
    )
  }

  console.log(`✓ Mechanics seeded for ${allCampaigns.length} campaigns`)

  console.log('✅ Seed complete!')
  process.exit(0)
}

seed().catch((err: unknown) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
