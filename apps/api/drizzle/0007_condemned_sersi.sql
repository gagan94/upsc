CREATE SCHEMA "practice";
--> statement-breakpoint
CREATE TABLE "practice"."question_versions" (
	"question_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"correct_option" char(1) NOT NULL,
	"changed_by" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_versions_question_id_version_pk" PRIMARY KEY("question_id","version")
);
--> statement-breakpoint
CREATE TABLE "practice"."questions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"format" text NOT NULL,
	"stem" text NOT NULL,
	"statements" jsonb,
	"options" jsonb NOT NULL,
	"correct_option" char(1) NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"option_reasoning" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"misconception" jsonb,
	"difficulty" text NOT NULL,
	"subject_node_id" uuid NOT NULL,
	"topic" text,
	"gs_paper" text NOT NULL,
	"source_type" text DEFAULT 'platform' NOT NULL,
	"pyq_year" integer,
	"pyq_paper" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice"."question_versions" ADD CONSTRAINT "question_versions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "practice"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice"."question_versions" ADD CONSTRAINT "question_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice"."questions" ADD CONSTRAINT "questions_subject_node_id_syllabus_nodes_id_fk" FOREIGN KEY ("subject_node_id") REFERENCES "catalog"."syllabus_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice"."questions" ADD CONSTRAINT "questions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "questions_status_subject_idx" ON "practice"."questions" USING btree ("status","subject_node_id");--> statement-breakpoint
CREATE INDEX "questions_status_source_verification_idx" ON "practice"."questions" USING btree ("status","source_type","verification_status");