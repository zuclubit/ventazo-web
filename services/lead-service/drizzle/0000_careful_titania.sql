CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"website" varchar(255),
	"industry" varchar(100),
	"employee_count" integer,
	"annual_revenue" integer,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"score" integer DEFAULT 50 NOT NULL,
	"source" varchar(100) NOT NULL,
	"owner_id" uuid,
	"notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone,
	"next_follow_up_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_data" jsonb NOT NULL,
	"tenant_id" uuid NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"published" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_tenant_id_idx" ON "leads" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_owner_id_idx" ON "leads" ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_score_idx" ON "leads" ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_source_idx" ON "leads" ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_next_follow_up_idx" ON "leads" ("next_follow_up_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_tenant_status_idx" ON "leads" ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_tenant_owner_idx" ON "leads" ("tenant_id","owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_published_idx" ON "outbox_events" ("published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_tenant_id_idx" ON "outbox_events" ("tenant_id");