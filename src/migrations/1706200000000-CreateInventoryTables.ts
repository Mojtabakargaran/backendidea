import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryTables1706200000000 implements MigrationInterface {
  name = 'CreateInventoryTables1706200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create serial_number_sequences table
    await queryRunner.query(`
      CREATE TABLE "serial_number_sequences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "prefix" character varying(10) NOT NULL DEFAULT 'SN',
        "current_number" bigint NOT NULL DEFAULT '1',
        "padding_length" integer NOT NULL DEFAULT '8',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_serial_number_sequences" PRIMARY KEY ("id")
      )
    `);

    // Create unique index for active sequences per tenant
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_serial_number_sequences_active_tenant" 
      ON "serial_number_sequences" ("tenant_id") 
      WHERE "is_active" = true
    `);

    // Create inventory_items table
    await queryRunner.query(`
      CREATE TABLE "inventory_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "tenant_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "item_type" character varying NOT NULL,
        "serial_number" character varying(100),
        "quantity" numeric(10,2),
        "quantity_unit" character varying(50),
        "availability_status" character varying NOT NULL DEFAULT 'available',
        "status" character varying NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_inventory_items_type_requirements" CHECK (
          (item_type = 'serialized' AND serial_number IS NOT NULL) OR 
          (item_type = 'non_serialized' AND quantity IS NOT NULL)
        )
      )
    `);

    // Create unique indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_inventory_items_tenant_name" 
      ON "inventory_items" ("tenant_id", "name")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_inventory_items_tenant_serial" 
      ON "inventory_items" ("tenant_id", "serial_number") 
      WHERE "serial_number" IS NOT NULL
    `);

    // Create regular indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_items_tenant_id" 
      ON "inventory_items" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_items_category_id" 
      ON "inventory_items" ("category_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_items_item_type" 
      ON "inventory_items" ("item_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_items_availability_status" 
      ON "inventory_items" ("availability_status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_items_status" 
      ON "inventory_items" ("status")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "serial_number_sequences" 
      ADD CONSTRAINT "FK_serial_number_sequences_tenant" 
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_items" 
      ADD CONSTRAINT "FK_inventory_items_tenant" 
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_items" 
      ADD CONSTRAINT "FK_inventory_items_category" 
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "serial_number_sequences" IS 'Manages auto-generated serial number sequences for each tenant'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "inventory_items" IS 'Stores inventory items for rental management system'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "inventory_items"."item_type" IS 'Type of inventory item: serialized or non_serialized'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "inventory_items"."serial_number" IS 'Serial number for serialized items'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "inventory_items"."quantity" IS 'Quantity for non-serialized items'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "inventory_items"."quantity_unit" IS 'Unit of measurement for quantity (e.g., pieces, sets, boxes)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "inventory_items"."availability_status" IS 'Current availability status of the item'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "inventory_items"."status" IS 'Overall status of the inventory item'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`
      ALTER TABLE "inventory_items" DROP CONSTRAINT "FK_inventory_items_category"
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_items" DROP CONSTRAINT "FK_inventory_items_tenant"
    `);

    await queryRunner.query(`
      ALTER TABLE "serial_number_sequences" DROP CONSTRAINT "FK_serial_number_sequences_tenant"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_inventory_items_status"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_items_availability_status"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_items_item_type"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_items_category_id"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_items_tenant_id"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_items_tenant_serial"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_items_tenant_name"`);
    await queryRunner.query(`DROP INDEX "IDX_serial_number_sequences_active_tenant"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "inventory_items"`);
    await queryRunner.query(`DROP TABLE "serial_number_sequences"`);
  }
}
