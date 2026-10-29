CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE TABLE "identity"."profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text
);
--> statement-breakpoint
CREATE TABLE "identity"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"auth_provider" text DEFAULT 'supabase' NOT NULL,
	"auth_subject" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"roles" text[] DEFAULT '{student}'::text[] NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_auth_provider_subject_uq" UNIQUE("auth_provider","auth_subject")
);
--> statement-breakpoint
ALTER TABLE "identity"."profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "identity"."users" USING btree (lower("email"));