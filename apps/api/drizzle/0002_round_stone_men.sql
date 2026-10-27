CREATE SCHEMA "catalog";
--> statement-breakpoint
CREATE TABLE "catalog"."activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"module_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"est_minutes" integer,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."lessons" (
	"activity_id" uuid PRIMARY KEY NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_status" text DEFAULT 'platform_sample' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."modules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."subjects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"syllabus_node_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"gs_paper" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"entitlement_key" text,
	"status" text DEFAULT 'draft' NOT NULL,
	CONSTRAINT "subjects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."syllabus_nodes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parent_id" uuid,
	"path" text NOT NULL,
	"level" integer NOT NULL,
	"exam_stage" text NOT NULL,
	"paper" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	CONSTRAINT "syllabus_nodes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "catalog"."activities" ADD CONSTRAINT "activities_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "catalog"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."lessons" ADD CONSTRAINT "lessons_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "catalog"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."modules" ADD CONSTRAINT "modules_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "catalog"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."subjects" ADD CONSTRAINT "subjects_syllabus_node_id_syllabus_nodes_id_fk" FOREIGN KEY ("syllabus_node_id") REFERENCES "catalog"."syllabus_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."syllabus_nodes" ADD CONSTRAINT "syllabus_nodes_parent_id_syllabus_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "catalog"."syllabus_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_module_idx" ON "catalog"."activities" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "modules_subject_idx" ON "catalog"."modules" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "subjects_syllabus_node_idx" ON "catalog"."subjects" USING btree ("syllabus_node_id");