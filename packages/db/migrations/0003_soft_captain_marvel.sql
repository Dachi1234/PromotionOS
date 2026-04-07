CREATE TABLE "player_campaign_optins" (
	"player_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"opted_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_campaign_optins_player_id_campaign_id_pk" PRIMARY KEY("player_id","campaign_id")
);
--> statement-breakpoint
ALTER TABLE "player_campaign_optins" ADD CONSTRAINT "player_campaign_optins_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;