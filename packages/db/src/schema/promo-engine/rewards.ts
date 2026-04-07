import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  numeric,
  text,
  jsonb,
} from 'drizzle-orm/pg-core'
import { timestamptz } from '../../helpers'
import { campaigns } from './campaigns'
import { mechanics } from './mechanics'

export const rewardTypeEnum = pgEnum('reward_type', [
  'FREE_SPINS',
  'FREE_BET',
  'CASH',
  'CASHBACK',
  'VIRTUAL_COINS',
  'MULTIPLIER',
  'PHYSICAL',
  'ACCESS_UNLOCK',
  'EXTRA_SPIN',
])

export const playerRewardStatusEnum = pgEnum('player_reward_status', [
  'pending',
  'condition_pending',
  'fulfilled',
  'expired',
  'forfeited',
])

export const rewardExecutionStatusEnum = pgEnum('reward_execution_status', [
  'pending',
  'success',
  'failed',
  'retrying',
])

export const rewardDefinitions = pgTable('reward_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  mechanicId: uuid('mechanic_id')
    .notNull()
    .references(() => mechanics.id, { onDelete: 'cascade' }),
  type: rewardTypeEnum('type').notNull(),
  config: jsonb('config').notNull(),
  probabilityWeight: numeric('probability_weight', { precision: 8, scale: 4 }),
  conditionConfig: jsonb('condition_config'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

export const playerRewards = pgTable('player_rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').notNull(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  mechanicId: uuid('mechanic_id')
    .notNull()
    .references(() => mechanics.id),
  rewardDefinitionId: uuid('reward_definition_id')
    .notNull()
    .references(() => rewardDefinitions.id),
  status: playerRewardStatusEnum('status').notNull(),
  conditionSnapshot: jsonb('condition_snapshot'),
  grantedAt: timestamptz('granted_at').notNull().defaultNow(),
  expiresAt: timestamptz('expires_at'),
  fulfilledAt: timestamptz('fulfilled_at'),
})

export const rewardExecutions = pgTable('reward_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerRewardId: uuid('player_reward_id')
    .notNull()
    .references(() => playerRewards.id),
  externalService: text('external_service').notNull(),
  requestPayload: jsonb('request_payload').notNull(),
  responsePayload: jsonb('response_payload'),
  status: rewardExecutionStatusEnum('status').notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptedAt: timestamptz('last_attempted_at'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

export type RewardDefinition = typeof rewardDefinitions.$inferSelect
export type NewRewardDefinition = typeof rewardDefinitions.$inferInsert
export type PlayerReward = typeof playerRewards.$inferSelect
export type NewPlayerReward = typeof playerRewards.$inferInsert
export type RewardExecution = typeof rewardExecutions.$inferSelect
export type NewRewardExecution = typeof rewardExecutions.$inferInsert
