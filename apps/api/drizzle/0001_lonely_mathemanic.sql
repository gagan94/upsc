CREATE SCHEMA "billing";
--> statement-breakpoint
CREATE TABLE "billing"."entitlement_overrides" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"enabled" boolean NOT NULL,
	"limit_value" integer,
	"period" text DEFAULT 'none' NOT NULL,
	"expires_at" timestamp with time zone,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."feature_catalog" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"default_period" text DEFAULT 'none' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."plan_entitlements" (
	"plan_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"enabled" boolean NOT NULL,
	"limit_value" integer,
	"period" text DEFAULT 'none' NOT NULL,
	CONSTRAINT "plan_entitlements_plan_id_feature_key_pk" PRIMARY KEY("plan_id","feature_key")
);
--> statement-breakpoint
CREATE TABLE "billing"."plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "plans_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "billing"."subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" text NOT NULL,
	"current_period_end" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "billing"."usage_counters" (
	"user_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_counters_user_id_feature_key_window_start_pk" PRIMARY KEY("user_id","feature_key","window_start")
);
--> statement-breakpoint
ALTER TABLE "billing"."entitlement_overrides" ADD CONSTRAINT "entitlement_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."entitlement_overrides" ADD CONSTRAINT "entitlement_overrides_feature_key_feature_catalog_key_fk" FOREIGN KEY ("feature_key") REFERENCES "billing"."feature_catalog"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."plan_entitlements" ADD CONSTRAINT "plan_entitlements_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "billing"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."plan_entitlements" ADD CONSTRAINT "plan_entitlements_feature_key_feature_catalog_key_fk" FOREIGN KEY ("feature_key") REFERENCES "billing"."feature_catalog"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "billing"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."usage_counters" ADD CONSTRAINT "usage_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;