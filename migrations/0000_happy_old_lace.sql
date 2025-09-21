CREATE TYPE "public"."action_type" AS ENUM('create', 'update', 'delete', 'upload', 'login', 'logout', 'import', 'export');--> statement-breakpoint
CREATE TYPE "public"."client_type" AS ENUM('client', 'provider', 'both');--> statement-breakpoint
CREATE TYPE "public"."currency_position" AS ENUM('before', 'after');--> statement-breakpoint
CREATE TYPE "public"."decimal_separator" AS ENUM(',', '.');--> statement-breakpoint
CREATE TYPE "public"."fiscal_period" AS ENUM('calendar', 'may_april');--> statement-breakpoint
CREATE TYPE "public"."invoice_class" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('income', 'expense', 'neutral');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('approved', 'pending_review', 'draft');--> statement-breakpoint
CREATE TYPE "public"."rounding_mode" AS ENUM('round', 'ceil', 'floor');--> statement-breakpoint
CREATE TYPE "public"."thousand_separator" AS ENUM('.', ',', ' ', 'none');--> statement-breakpoint
CREATE TYPE "public"."upload_job_status" AS ENUM('queued', 'processing', 'success', 'duplicate', 'error');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" text NOT NULL,
	"action_type" "action_type" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar,
	"description" text NOT NULL,
	"metadata" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"original_data" text NOT NULL,
	"corrected_data" text NOT NULL,
	"feedback_type" text NOT NULL,
	"confidence" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients_providers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cuit" text,
	"type" "client_type" NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"total_operations" numeric(15, 2) DEFAULT '0',
	"last_invoice_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_providers_cuit_unique" UNIQUE("cuit")
);
--> statement-breakpoint
CREATE TABLE "data_backups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"description" text NOT NULL,
	"backup_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"record_count" integer NOT NULL,
	"created_by" varchar NOT NULL,
	"created_by_name" text NOT NULL,
	"file_path" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deleted_invoices_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_invoice_id" varchar NOT NULL,
	"type" "invoice_type" NOT NULL,
	"invoice_class" "invoice_class" DEFAULT 'A' NOT NULL,
	"invoice_number" text,
	"description" text,
	"date" timestamp,
	"client_provider_name" text NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"iva_amount" numeric(15, 2) NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"uploaded_by_name" text NOT NULL,
	"deleted_by" varchar NOT NULL,
	"deleted_by_name" text NOT NULL,
	"deleted_at" timestamp DEFAULT now() NOT NULL,
	"original_data" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'custom' NOT NULL,
	"type" "invoice_type" NOT NULL,
	"invoice_class" "invoice_class" DEFAULT 'A' NOT NULL,
	"client_provider_name" text,
	"client_provider_cuit" text,
	"default_subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"default_iva_percentage" numeric(5, 2) DEFAULT '21' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "invoice_type" NOT NULL,
	"invoice_class" "invoice_class" DEFAULT 'A' NOT NULL,
	"invoice_number" text,
	"description" text,
	"date" timestamp,
	"client_provider_id" varchar,
	"client_provider_name" text NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"iva_amount" numeric(15, 2) NOT NULL,
	"iibb_amount" numeric(15, 2) DEFAULT '0',
	"ganancias_amount" numeric(15, 2) DEFAULT '0',
	"other_taxes" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_date" timestamp,
	"due_date" timestamp,
	"uploaded_by" varchar NOT NULL,
	"uploaded_by_name" text NOT NULL,
	"owner_id" varchar,
	"owner_name" text,
	"file_path" text,
	"file_name" text,
	"file_size" integer,
	"fingerprint" text,
	"extracted_data" text,
	"processed" boolean DEFAULT false,
	"needs_review" boolean DEFAULT false NOT NULL,
	"review_status" "review_status" DEFAULT 'approved' NOT NULL,
	"extraction_confidence" numeric(5, 2) DEFAULT '95.0',
	"ai_extracted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "iva_components" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"description" text NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"fingerprint" text NOT NULL,
	"status" "upload_job_status" DEFAULT 'queued' NOT NULL,
	"invoice_id" varchar,
	"error" text,
	"file_path" text NOT NULL,
	"uploaded_by_name" text,
	"owner_name" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"last_retry_at" timestamp,
	"quarantined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "upload_jobs_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"avatar" text,
	"company_logo" text,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"fiscal_period" "fiscal_period" DEFAULT 'calendar' NOT NULL,
	"decimal_separator" decimal_separator DEFAULT ',' NOT NULL,
	"thousand_separator" "thousand_separator" DEFAULT '.' NOT NULL,
	"decimal_places" integer DEFAULT 2 NOT NULL,
	"currency_symbol" text DEFAULT '$' NOT NULL,
	"currency_position" "currency_position" DEFAULT 'before' NOT NULL,
	"rounding_mode" "rounding_mode" DEFAULT 'round' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_backups" ADD CONSTRAINT "data_backups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deleted_invoices_log" ADD CONSTRAINT "deleted_invoices_log_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_templates" ADD CONSTRAINT "invoice_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_provider_id_clients_providers_id_fk" FOREIGN KEY ("client_provider_id") REFERENCES "public"."clients_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iva_components" ADD CONSTRAINT "iva_components_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;