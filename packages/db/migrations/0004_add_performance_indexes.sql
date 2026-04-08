-- Performance indexes for PromotionOS
-- These address the complete absence of secondary indexes across all tables.

-- ============================================================
-- raw_events: most-queried table in the event pipeline
-- ============================================================

-- Event lookup by player + type + time window (aggregation queries)
CREATE INDEX idx_raw_events_player_event_time
  ON raw_events (player_id, event_type, occurred_at DESC);

-- Batch processing: find unprocessed events efficiently
CREATE INDEX idx_raw_events_unprocessed
  ON raw_events (occurred_at)
  WHERE processed = false;

-- ============================================================
-- player_campaign_stats: leaderboard + progression queries
-- ============================================================

-- Leaderboard ranking: filter by campaign+mechanic+window, then ORDER BY value
CREATE INDEX idx_pcs_leaderboard
  ON player_campaign_stats (campaign_id, mechanic_id, metric_type, window_type, window_start);

-- Player progression: all stats for a player in a campaign
CREATE INDEX idx_pcs_player_campaign
  ON player_campaign_stats (player_id, campaign_id);

-- ============================================================
-- player_rewards: reward history + status filtering
-- ============================================================

-- Player reward history
CREATE INDEX idx_player_rewards_player_id
  ON player_rewards (player_id);

-- Campaign + player rewards (for campaign-scoped queries)
CREATE INDEX idx_player_rewards_campaign_player
  ON player_rewards (campaign_id, player_id);

-- Status filtering (pending rewards, condition_pending expiry checks)
CREATE INDEX idx_player_rewards_status
  ON player_rewards (status);

-- Expiration cleanup queries
CREATE INDEX idx_player_rewards_expires_at
  ON player_rewards (expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================
-- campaigns: scheduler + status queries
-- ============================================================

-- Campaign scheduler: find campaigns by status + schedule
CREATE INDEX idx_campaigns_status
  ON campaigns (status);

CREATE INDEX idx_campaigns_status_schedule
  ON campaigns (status, starts_at, ends_at);

-- ============================================================
-- mechanics: campaign lookup + active filtering
-- ============================================================

-- Mechanics by campaign (used on every event + player-state request)
CREATE INDEX idx_mechanics_campaign_id
  ON mechanics (campaign_id);

-- Active mechanics per campaign
CREATE INDEX idx_mechanics_campaign_active
  ON mechanics (campaign_id, is_active);

-- ============================================================
-- aggregation_rules: trigger matching
-- ============================================================

-- Trigger matcher: find rules by event type
CREATE INDEX idx_agg_rules_source_event_type
  ON aggregation_rules (source_event_type);

-- Campaign + mechanic lookup
CREATE INDEX idx_agg_rules_campaign_mechanic
  ON aggregation_rules (campaign_id, mechanic_id);

-- ============================================================
-- reward_definitions: mechanic lookup
-- ============================================================

CREATE INDEX idx_reward_defs_mechanic_id
  ON reward_definitions (mechanic_id);

-- ============================================================
-- reward_executions: failed job retry
-- ============================================================

CREATE INDEX idx_reward_executions_status
  ON reward_executions (status);

-- ============================================================
-- mock_sessions: token lookup + expiry cleanup
-- ============================================================

CREATE INDEX idx_mock_sessions_expires_at
  ON mock_sessions (expires_at);

-- ============================================================
-- mock_players: segment targeting + VIP filtering
-- ============================================================

CREATE INDEX idx_mock_players_segment_tags
  ON mock_players USING GIN (segment_tags);

CREATE INDEX idx_mock_players_vip_tier
  ON mock_players (vip_tier);
