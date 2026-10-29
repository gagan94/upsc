CREATE SCHEMA "planner";
--> statement-breakpoint
CREATE TABLE "planner"."tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subject_node_id" uuid,
	"activity_type" text DEFAULT 'other' NOT NULL,
	"duration_min" integer,
	"scheduled_start" timestamp with time zone,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"completed_at" timestamp with time zone,
	"actual_min" integer,
	"source" text DEFAULT 'manual' NOT NULL,
	"linked" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD CONSTRAINT "tasks_subject_node_id_syllabus_nodes_id_fk" FOREIGN KEY ("subject_node_id") REFERENCES "catalog"."syllabus_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_user_scheduled_idx" ON "planner"."tasks" USING btree ("user_id","scheduled_start");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "planner"."tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_user_backlog_idx" ON "planner"."tasks" USING btree ("user_id") WHERE scheduled_start is null and deleted_at is null;