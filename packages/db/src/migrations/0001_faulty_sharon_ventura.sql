ALTER TABLE "registrations" ADD COLUMN "is_admin_override" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "override_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "last_edited_by_user_id" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_last_edited_by_user_id_user_id_fk" FOREIGN KEY ("last_edited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registrations_created_by_idx" ON "registrations" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "registrations_last_edited_by_idx" ON "registrations" USING btree ("last_edited_by_user_id");