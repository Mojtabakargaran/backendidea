import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventorySerializedFieldsAndBulkOps1754369260926
  implements MigrationInterface
{
  name = 'AddInventorySerializedFieldsAndBulkOps1754369260926';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_item_status_changes_previous_status_enum" AS ENUM('available', 'rented', 'maintenance', 'damaged', 'lost')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_item_status_changes_new_status_enum" AS ENUM('available', 'rented', 'maintenance', 'damaged', 'lost')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_item_status_changes_change_type_enum" AS ENUM('manual', 'automatic')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_item_status_changes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "inventory_item_id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "changed_by" uuid NOT NULL, "previous_status" "public"."inventory_item_status_changes_previous_status_enum" NOT NULL, "new_status" "public"."inventory_item_status_changes_new_status_enum" NOT NULL, "change_reason" character varying(500), "expected_resolution_date" TIMESTAMP WITH TIME ZONE, "change_type" "public"."inventory_item_status_changes_change_type_enum" NOT NULL DEFAULT 'manual', "ip_address" character varying(45), "user_agent" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cde14d00579b126bad7f7ca7dd4" PRIMARY KEY ("id")); COMMENT ON COLUMN "inventory_item_status_changes"."previous_status" IS 'Previous availability status'; COMMENT ON COLUMN "inventory_item_status_changes"."new_status" IS 'New availability status'; COMMENT ON COLUMN "inventory_item_status_changes"."change_reason" IS 'Reason for status change'; COMMENT ON COLUMN "inventory_item_status_changes"."expected_resolution_date" IS 'Expected resolution date for maintenance/damaged items'; COMMENT ON COLUMN "inventory_item_status_changes"."change_type" IS 'Type of status change (manual or automatic)'; COMMENT ON COLUMN "inventory_item_status_changes"."ip_address" IS 'IP address of the user making the change'; COMMENT ON COLUMN "inventory_item_status_changes"."user_agent" IS 'User agent string'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_91411f8f3438ba83da79002e27" ON "inventory_item_status_changes" ("changed_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_96a033ba929312b1c98a7d2211" ON "inventory_item_status_changes" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec97cdf793064c07027e2b0917" ON "inventory_item_status_changes" ("inventory_item_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_bulk_operations_operation_type_enum" AS ENUM('update_category', 'update_status', 'update_availability', 'update_maintenance', 'update_quantity')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_bulk_operations_status_enum" AS ENUM('initiated', 'processing', 'completed', 'failed', 'partially_completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_bulk_operations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "initiated_by" uuid NOT NULL, "operation_type" "public"."inventory_bulk_operations_operation_type_enum" NOT NULL, "target_item_ids" jsonb NOT NULL, "operation_parameters" jsonb NOT NULL, "status" "public"."inventory_bulk_operations_status_enum" NOT NULL DEFAULT 'initiated', "total_items" integer NOT NULL, "successful_items" integer NOT NULL DEFAULT '0', "failed_items" integer NOT NULL DEFAULT '0', "failure_details" jsonb, "ip_address" character varying(45) NOT NULL, "user_agent" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_667b5e4cd0df89bd19df06d71b0" PRIMARY KEY ("id")); COMMENT ON COLUMN "inventory_bulk_operations"."operation_type" IS 'Type of bulk operation being performed'; COMMENT ON COLUMN "inventory_bulk_operations"."target_item_ids" IS 'Array of target item IDs for the operation'; COMMENT ON COLUMN "inventory_bulk_operations"."operation_parameters" IS 'Parameters for the bulk operation'; COMMENT ON COLUMN "inventory_bulk_operations"."status" IS 'Current status of the bulk operation'; COMMENT ON COLUMN "inventory_bulk_operations"."total_items" IS 'Total number of items to process'; COMMENT ON COLUMN "inventory_bulk_operations"."successful_items" IS 'Number of successfully processed items'; COMMENT ON COLUMN "inventory_bulk_operations"."failed_items" IS 'Number of items that failed processing'; COMMENT ON COLUMN "inventory_bulk_operations"."failure_details" IS 'Details about failed items and reasons'; COMMENT ON COLUMN "inventory_bulk_operations"."ip_address" IS 'IP address of the user who initiated the operation'; COMMENT ON COLUMN "inventory_bulk_operations"."user_agent" IS 'User agent of the client who initiated the operation'; COMMENT ON COLUMN "inventory_bulk_operations"."completed_at" IS 'Timestamp when the operation was completed'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_20d623dfa20e8356c856fba57b" ON "inventory_bulk_operations" ("tenant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c145c0bdd3579eaab17b33e9b" ON "inventory_bulk_operations" ("tenant_id", "initiated_by") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_items_serial_number_source_enum" AS ENUM('auto_generated', 'manual')`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "serial_number_source" "public"."inventory_items_serial_number_source_enum"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."serial_number_source" IS 'Source of serial number generation'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "previous_serial_number" character varying(100)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."previous_serial_number" IS 'Previous serial number for tracking changes'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "condition_notes" text`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."condition_notes" IS 'Notes about item condition'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "last_maintenance_date" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."last_maintenance_date" IS 'Date of last maintenance performed'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "next_maintenance_due_date" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."next_maintenance_due_date" IS 'Date when next maintenance is due'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "allocated_quantity" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."allocated_quantity" IS 'Currently allocated quantity'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."audit_logs_action_enum" RENAME TO "audit_logs_action_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('user_created', 'role_assigned', 'user_updated', 'user_status_changed', 'user_role_changed', 'user_deleted', 'user_locked', 'user_unlocked', 'role_removed', 'password_reset_initiated', 'password_reset_completed', 'temporary_password_generated', 'profile_updated', 'password_changed', 'session_terminated', 'profile_viewed', 'activity_viewed', 'login_success', 'login_failed', 'logout', 'audit_logs_viewed', 'audit_export_initiated', 'permission_granted', 'permission_denied', 'permission_check_failed', 'privilege_escalation_attempt', 'category_created', 'category_updated', 'category_deleted', 'inventory_item_created', 'inventory_item_updated', 'inventory_item_deleted', 'inventory_item_quantity_updated', 'inventory_item_serial_number_changed', 'inventory_item_maintenance_updated', 'inventory_status_changed', 'inventory_item_viewed', 'inventory_list_viewed', 'inventory_exported', 'inventory_items_bulk_updated', 'inventory_bulk_operation_initiated')`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "public"."audit_logs_action_enum" USING "action"::"text"::"public"."audit_logs_action_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "inventory_item_status_changes" ADD CONSTRAINT "FK_77f2fc6b03e0823b54cc72be9fa" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item_status_changes" ADD CONSTRAINT "FK_96a033ba929312b1c98a7d22111" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item_status_changes" ADD CONSTRAINT "FK_91411f8f3438ba83da79002e27e" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_bulk_operations" ADD CONSTRAINT "FK_a7c2190e8d188c497519521a71a" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_bulk_operations" ADD CONSTRAINT "FK_e2fe784ac1106d27083535efdef" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_bulk_operations" DROP CONSTRAINT "FK_e2fe784ac1106d27083535efdef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_bulk_operations" DROP CONSTRAINT "FK_a7c2190e8d188c497519521a71a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item_status_changes" DROP CONSTRAINT "FK_91411f8f3438ba83da79002e27e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item_status_changes" DROP CONSTRAINT "FK_96a033ba929312b1c98a7d22111"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item_status_changes" DROP CONSTRAINT "FK_77f2fc6b03e0823b54cc72be9fa"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_action_enum_old" AS ENUM('user_created', 'role_assigned', 'user_updated', 'user_status_changed', 'user_role_changed', 'user_deleted', 'user_locked', 'user_unlocked', 'role_removed', 'password_reset_initiated', 'password_reset_completed', 'temporary_password_generated', 'profile_updated', 'password_changed', 'session_terminated', 'profile_viewed', 'activity_viewed', 'login_success', 'login_failed', 'logout', 'audit_logs_viewed', 'audit_export_initiated', 'permission_granted', 'permission_denied', 'permission_check_failed', 'privilege_escalation_attempt', 'category_created', 'category_updated', 'category_deleted', 'inventory_item_created', 'inventory_item_updated', 'inventory_item_deleted', 'inventory_status_changed', 'inventory_item_viewed', 'inventory_list_viewed', 'inventory_exported')`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "public"."audit_logs_action_enum_old" USING "action"::"text"::"public"."audit_logs_action_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."audit_logs_action_enum_old" RENAME TO "audit_logs_action_enum"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."allocated_quantity" IS 'Currently allocated quantity'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "allocated_quantity"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."next_maintenance_due_date" IS 'Date when next maintenance is due'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "next_maintenance_due_date"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."last_maintenance_date" IS 'Date of last maintenance performed'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "last_maintenance_date"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."condition_notes" IS 'Notes about item condition'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "condition_notes"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."previous_serial_number" IS 'Previous serial number for tracking changes'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "previous_serial_number"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "inventory_items"."serial_number_source" IS 'Source of serial number generation'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "serial_number_source"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."inventory_items_serial_number_source_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6c145c0bdd3579eaab17b33e9b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_20d623dfa20e8356c856fba57b"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_bulk_operations"`);
    await queryRunner.query(
      `DROP TYPE "public"."inventory_bulk_operations_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."inventory_bulk_operations_operation_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ec97cdf793064c07027e2b0917"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_96a033ba929312b1c98a7d2211"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_91411f8f3438ba83da79002e27"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_item_status_changes"`);
    await queryRunner.query(
      `DROP TYPE "public"."inventory_item_status_changes_change_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."inventory_item_status_changes_new_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."inventory_item_status_changes_previous_status_enum"`,
    );
  }
}
