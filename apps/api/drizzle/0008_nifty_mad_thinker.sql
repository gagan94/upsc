CREATE TABLE "practice"."session_questions" (
	"session_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"question_id" uuid NOT NULL,
	"question_version" integer NOT NULL,
	"selected" char(1),
	"flagged" boolean DEFAULT false NOT NULL,
	"confidence" text,
	"time_ms" integer DEFAULT 0 NOT NULL,
	"answered_at" timestamp with time zone,
	"reasoning_text" text,
	"correct" boolean,
	"marks" numeric,
	CONSTRAINT "session_questions_session_id_ordinal_pk" PRIMARY KEY("session_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE "practice"."sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text DEFAULT 'practice' NOT NULL,
	"mode" text NOT NULL,
	"timed" boolean NOT NULL,
	"config" jsonb NOT NULL,
	"marking" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"score" numeric,
	"accuracy" numeric,
	"correct_count" integer,
	"incorrect_count" integer,
	"skipped_count" integer,
	"summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice"."session_questions" ADD CONSTRAINT "session_questions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "practice"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice"."session_questions" ADD CONSTRAINT "session_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "practice"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_questions_question_idx" ON "practice"."session_questions" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "sessions_user_created_idx" ON "practice"."sessions" USING btree ("user_id","created_at");