CREATE TABLE "planner"."study_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid,
	"subject_node_id" uuid,
	"planned_min" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"paused_seconds" integer DEFAULT 0 NOT NULL,
	"idle_seconds" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"end_reason" text,
	"focus_rating" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_sessions" ADD CONSTRAINT "study_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "planner"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_sessions" ADD CONSTRAINT "study_sessions_subject_node_id_syllabus_nodes_id_fk" FOREIGN KEY ("subject_node_id") REFERENCES "catalog"."syllabus_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "study_sessions_one_active_idx" ON "planner"."study_sessions" USING btree ("user_id") WHERE status in ('running', 'paused');--> statement-breakpoint
CREATE INDEX "study_sessions_user_started_idx" ON "planner"."study_sessions" USING btree ("user_id","started_at");