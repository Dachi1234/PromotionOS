CREATE TYPE "public"."asset_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."metric_type_enum" AS ENUM('COUNT', 'SUM', 'AVERAGE');--> statement-breakpoint
CREATE TYPE "public"."window_type" AS ENUM('minute', 'hourly', 'daily', 'weekly', 'campaign', 'rolling');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'active', 'paused', 'ended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('BET', 'DEPOSIT', 'REFERRAL', 'LOGIN', 'OPT_IN', 'FREE_SPIN_USED', 'MANUAL', 'MECHANIC_OUTCOME');--> statement-breakpoint
CREATE TYPE "public"."mechanic_role" AS ENUM('primary', 'unlocked');--> statement-breakpoint
CREATE TYPE "public"."mechanic_type" AS ENUM('WHEEL', 'WHEEL_IN_WHEEL', 'LEADERBOARD', 'LEADERBOARD_LAYERED', 'MISSION', 'PROGRESS_BAR', 'CASHOUT', 'TOURNAMENT');--> statement-breakpoint
CREATE TYPE "public"."vip_tier" AS ENUM('bronze', 'silver', 'gold', 'platinum');--> statement-breakpoint
CREATE TYPE "public"."player_reward_status" AS ENUM('pending', 'condition_pending', 'fulfilled', 'expired', 'forfeited');--> statement-breakpoint
CREATE TYPE "public"."reward_execution_status" AS ENUM('pending', 'success', 'failed', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."reward_type" AS ENUM('FREE_SPINS', 'FREE_BET', 'CASH', 'CASHBACK', 'VIRTUAL_COINS', 'MULTIPLIER', 'PHYSICAL', 'ACCESS_UNLOCK', 'EXTRA_SPIN');--> statement-breakpoint
CREATE TABLE "canvas_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"url" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canvas_configs_campaign_id_unique" UNIQUE("campaign_id")
);
--> statement-breakpoint
CREATE TABLE "aggregation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"mechanic_id" uuid NOT NULL,
	"source_event_type" "event_type" NOT NULL,
	"metric" "metric_type_enum" NOT NULL,
	"transformation" jsonb NOT NULL,
	"window_type" "window_type" NOT NULL,
	"window_size_hours" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_campaign_stats" (
	"player_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"mechanic_id" uuid NOT NULL,
	"metric_type" text NOT NULL,
	"window_type" "window_type" NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"value" numeric(18, 4) DEFAULT '0' NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_campaign_stats_player_id_campaign_id_mechanic_id_metric_type_window_type_window_start_pk" PRIMARY KEY("player_id","campaign_id","mechanic_id","metric_type","window_type","window_start")
);
--> statement-breakpoint
CREATE TABLE "campaign_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text,
	"segment_rule_config" jsonb NOT NULL,
	"player_ids" uuid[],
	"snapshot_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"target_segment_id" uuid,
	"currency" text DEFAULT 'GEL' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"canvas_config" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "raw_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"campaign_id" uuid,
	"event_type" "event_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_mechanics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"mechanic_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"role" "mechanic_role" DEFAULT 'primary' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mechanic_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mechanic_id" uuid NOT NULL,
	"depends_on_mechanic_id" uuid NOT NULL,
	"unlock_condition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mechanics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"type" "mechanic_type" NOT NULL,
	"config" jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"segment_tags" text[] DEFAULT '{}' NOT NULL,
	"vip_tier" "vip_tier" DEFAULT 'bronze' NOT NULL,
	"total_deposits_gel" numeric(18, 2) DEFAULT '0' NOT NULL,
	"registration_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mock_players_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "mock_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mock_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "player_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"mechanic_id" uuid NOT NULL,
	"reward_definition_id" uuid NOT NULL,
	"status" "player_reward_status" NOT NULL,
	"condition_snapshot" jsonb,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"fulfilled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reward_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mechanic_id" uuid NOT NULL,
	"type" "reward_type" NOT NULL,
	"config" jsonb NOT NULL,
	"probability_weight" numeric(8, 4),
	"condition_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_reward_id" uuid NOT NULL,
	"external_service" text NOT NULL,
	"request_payload" jsonb NOT NULL,
	"response_payload" jsonb,
	"status" "reward_execution_status" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"diff" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wizard_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"owner_id" uuid NOT NULL,
	"step_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canvas_assets" ADD CONSTRAINT "canvas_assets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_configs" ADD CONSTRAINT "canvas_configs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aggregation_rules" ADD CONSTRAINT "aggregation_rules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aggregation_rules" ADD CONSTRAINT "aggregation_rules_mechanic_id_mechanics_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_campaign_stats" ADD CONSTRAINT "player_campaign_stats_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_campaign_stats" ADD CONSTRAINT "player_campaign_stats_mechanic_id_mechanics_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_segments" ADD CONSTRAINT "campaign_segments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_events" ADD CONSTRAINT "raw_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_mechanics" ADD CONSTRAINT "campaign_mechanics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_mechanics" ADD CONSTRAINT "campaign_mechanics_mechanic_id_mechanics_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mechanic_dependencies" ADD CONSTRAINT "mechanic_dependencies_mechanic_id_mechanics_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mechanic_dependencies" ADD CONSTRAINT "mechanic_dependencies_depends_on_mechanic_id_mechanics_id_fk" FOREIGN KEY ("depends_on_mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mechanics" ADD CONSTRAINT "mechanics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_sessions" ADD CONSTRAINT "mock_sessions_player_id_mock_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."mock_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_rewards" ADD CONSTRAINT "player_rewards_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_rewards" ADD CONSTRAINT "player_rewards_mechanic_id_mechanics_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_rewards" ADD CONSTRAINT "player_rewards_reward_definition_id_reward_definitions_id_fk" FOREIGN KEY ("reward_definition_id") REFERENCES "public"."reward_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_definitions" ADD CONSTRAINT "reward_definitions_mechanic_id_mechanics_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_executions" ADD CONSTRAINT "reward_executions_player_reward_id_player_rewards_id_fk" FOREIGN KEY ("player_reward_id") REFERENCES "public"."player_rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_studio_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."studio_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizard_drafts" ADD CONSTRAINT "wizard_drafts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizard_drafts" ADD CONSTRAINT "wizard_drafts_owner_id_studio_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."studio_users"("id") ON DELETE no action ON UPDATE no action;