CREATE TABLE "player_mechanic_state" (
	"player_id" uuid NOT NULL,
	"mechanic_id" uuid NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_mechanic_state_player_id_mechanic_id_pk" PRIMARY KEY("player_id","mechanic_id")
);
--> statement-breakpoint
ALTER TABLE "player_mechanic_state" ADD CONSTRAINT "player_mechanic_state_mechanic_id_mechanics_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE cascade ON UPDATE no action;