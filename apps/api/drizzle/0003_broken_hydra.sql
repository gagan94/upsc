CREATE TABLE "identity"."preparation_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"target_year" integer,
	"stage" text,
	"attempt" text,
	"focus" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"medium" text DEFAULT 'en',
	"onboarding_status" text DEFAULT 'not_started',
	"onboarding_step" integer DEFAULT 0,
	"onboarding_answers" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."study_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"daily_goal_min" integer DEFAULT 240,
	"weekly_goal_min" integer DEFAULT 1680,
	"windows" jsonb DEFAULT '[]'::jsonb,
	"week_start" text DEFAULT 'monday',
	"default_session_min" integer DEFAULT 25,
	"reminders_enabled" boolean DEFAULT false,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identity"."profiles" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "identity"."preparation_profiles" ADD CONSTRAINT "preparation_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."study_preferences" ADD CONSTRAINT "study_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;