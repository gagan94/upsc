CREATE TABLE "planner"."exam_dates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"exam" text NOT NULL,
	"year" integer NOT NULL,
	"date" date NOT NULL,
	"status" text DEFAULT 'illustrative' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner"."goals" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"daily_min" integer NOT NULL,
	"weekly_min" integer NOT NULL,
	"monthly_milestone" text,
	"milestone_date" date,
	"subject_targets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;