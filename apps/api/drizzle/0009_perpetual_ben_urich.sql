CREATE TABLE "practice"."bookmarks" (
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "practice"."issue_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"type" text NOT NULL,
	"text" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice"."mistake_entries" (
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"times_wrong" integer DEFAULT 1 NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "mistake_entries_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "practice"."bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice"."bookmarks" ADD CONSTRAINT "bookmarks_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "practice"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice"."issue_reports" ADD CONSTRAINT "issue_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice"."issue_reports" ADD CONSTRAINT "issue_reports_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "practice"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice"."mistake_entries" ADD CONSTRAINT "mistake_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice"."mistake_entries" ADD CONSTRAINT "mistake_entries_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "practice"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_reports_status_created_idx" ON "practice"."issue_reports" USING btree ("status","created_at");