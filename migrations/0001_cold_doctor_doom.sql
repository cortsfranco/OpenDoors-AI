ALTER TYPE "public"."upload_job_status" ADD VALUE 'quarantined';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "fingerprint" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "fingerprint" SET NOT NULL;