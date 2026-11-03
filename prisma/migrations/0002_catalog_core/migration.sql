-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "stock_policy" AS ENUM ('TRACKING', 'NOT_TRACKED');

-- CreateEnum
CREATE TYPE "attribute_type" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "media_kind" AS ENUM ('IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "movement_reason" AS ENUM ('RECEIPT', 'SALE_RESERVATION', 'SALE_CONSUMPTION', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN_RESTOCK');

-- CreateTable
CREATE TABLE "MetaVersion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "schemaVer" TEXT NOT NULL DEFAULT '0.1.0',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "parent_id" TEXT,
    "name_en" VARCHAR(160) NOT NULL,
    "name_ar" VARCHAR(160) NOT NULL,
    "description_en" TEXT,
    "description_ar" TEXT,
    "image_asset_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "model_code" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "category_id" TEXT NOT NULL,
    "name_en" VARCHAR(200) NOT NULL,
    "name_ar" VARCHAR(200) NOT NULL,
    "short_desc_en" VARCHAR(500),
    "short_desc_ar" VARCHAR(500),
    "description_en" TEXT,
    "description_ar" TEXT,
    "base_price_minor" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'AED',
    "tax_code_id" TEXT,
    "status" "product_status" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "meta_title_en" VARCHAR(200),
    "meta_title_ar" VARCHAR(200),
    "meta_description_en" VARCHAR(300),
    "meta_description_ar" VARCHAR(300),
    "search_vector" tsvector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_attribute_options" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,

    CONSTRAINT "variant_attribute_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "is_standard" BOOLEAN NOT NULL DEFAULT false,
    "name_en" VARCHAR(200),
    "name_ar" VARCHAR(200),
    "stock_policy" "stock_policy" NOT NULL DEFAULT 'TRACKING',
    "weight_kg" DECIMAL(8,3),
    "dims_cm" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attributes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "label_en" VARCHAR(160) NOT NULL,
    "label_ar" VARCHAR(160) NOT NULL,
    "type" "attribute_type" NOT NULL,
    "unit" VARCHAR(32),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_options" (
    "id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "value_en" VARCHAR(160) NOT NULL,
    "value_ar" VARCHAR(160) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "attribute_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "option_id" TEXT,
    "text_value" VARCHAR(500),
    "num_value" DECIMAL(14,4),
    "bool_value" BOOLEAN,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "kind" "media_kind" NOT NULL DEFAULT 'IMAGE',
    "alt_en" VARCHAR(300),
    "alt_ar" VARCHAR(300),
    "width_px" INTEGER,
    "height_px" INTEGER,
    "bytes" INTEGER,
    "mime" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_lists" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name_en" VARCHAR(160) NOT NULL,
    "name_ar" VARCHAR(160) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'AED',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_to" TIMESTAMPTZ(6),

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" TEXT NOT NULL,
    "price_list_id" TEXT NOT NULL,
    "product_id" TEXT,
    "variant_id" TEXT,
    "price_minor" INTEGER NOT NULL,
    "compare_at_minor" INTEGER,
    "currency" CHAR(3) NOT NULL,
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_to" TIMESTAMPTZ(6),

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_codes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "rate_bps" INTEGER NOT NULL,
    "jurisdiction" VARCHAR(80) NOT NULL,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "active_from" TIMESTAMPTZ(6) NOT NULL,
    "active_to" TIMESTAMPTZ(6),

    CONSTRAINT "tax_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name_en" VARCHAR(160) NOT NULL,
    "name_ar" VARCHAR(160) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
    "reserved_qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "movement_reason" NOT NULL,
    "ref_type" VARCHAR(40),
    "ref_id" VARCHAR(64),
    "actor_id" VARCHAR(64),
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_category_slug" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "ix_category_parent" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "ix_category_active_sort" ON "categories"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_model_code" ON "products"("model_code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_slug" ON "products"("slug");

-- CreateIndex
CREATE INDEX "ix_product_category_status" ON "products"("category_id", "status");

-- CreateIndex
CREATE INDEX "ix_product_featured" ON "products"("status", "is_featured");

-- CreateIndex
CREATE INDEX "ix_product_slug" ON "products"("slug");

-- CreateIndex
CREATE INDEX "ix_variant_attr_option" ON "variant_attribute_options"("attribute_id", "option_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_variant_attr" ON "variant_attribute_options"("variant_id", "attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_variant_sku" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "ix_variant_product" ON "product_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_attribute_code" ON "attributes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_attr_option_value" ON "attribute_options"("attribute_id", "value_en");

-- CreateIndex
CREATE INDEX "ix_product_attr_attribute" ON "product_attributes"("attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_attr" ON "product_attributes"("product_id", "attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_media_key" ON "media_assets"("object_key");

-- CreateIndex
CREATE INDEX "ix_product_image_order" ON "product_images"("product_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_image" ON "product_images"("product_id", "asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pricelist_code" ON "price_lists"("code");

-- CreateIndex
CREATE INDEX "ix_price_item_product" ON "price_list_items"("price_list_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_price_item_variant" ON "price_list_items"("price_list_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_taxcode_code" ON "tax_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_warehouse_code" ON "warehouses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_stock_level" ON "stock_levels"("variant_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "ix_movement_variant_time" ON "stock_movements"("variant_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_movement_warehouse_time" ON "stock_movements"("warehouse_id", "created_at");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_options" ADD CONSTRAINT "variant_attribute_options_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_options" ADD CONSTRAINT "variant_attribute_options_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_options" ADD CONSTRAINT "variant_attribute_options_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "attribute_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_options" ADD CONSTRAINT "attribute_options_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Custom PostgreSQL objects (hand-authored; Prisma cannot express these).
-- Documented in docs/DATA_MODEL.md "Search & integrity extras".
-- ============================================================================

-- 1) English full-text search: convert plain tsvector column into a STORED
--    generated column over the English text fields (simple config — no stemmer,
--    documented limitation; Arabic ILIKE fallback lives in the service layer).
ALTER TABLE "products"
  ALTER COLUMN "search_vector" DROP DEFAULT,
  ALTER COLUMN "search_vector" TYPE tsvector
    USING to_tsvector('simple', coalesce(name_en,'') || ' ' || coalesce(short_desc_en,'') || ' ' || coalesce(description_en,'')),
  ALTER COLUMN "search_vector" SET GENERATED ALWAYS AS
    ( setweight(to_tsvector('simple', coalesce("name_en",'')), 'A')
    || setweight(to_tsvector('simple', coalesce("short_desc_en",'')), 'B')
    || setweight(to_tsvector('simple', coalesce("description_en",'')), 'C') ) STORED;

CREATE INDEX "ix_product_search" ON "products" USING GIN ("search_vector");

-- 2) Inventory CHECK constraints (refinement #5 companion):
ALTER TABLE "stock_levels"
  ADD CONSTRAINT "chk_stock_onhand_nonneg"   CHECK ("quantity_on_hand" >= 0),
  ADD CONSTRAINT "chk_stock_reserved_le"     CHECK ("reserved_qty" <= "quantity_on_hand");

-- 3) Append-only StockMovement ledger (refinement #5): reject UPDATE/DELETE at
--    the database level. Corrections are compensating INSERTs only.
CREATE FUNCTION "guard_stock_movements_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'stock_movements is append-only (INSERT only); use a compensating entry';
END;
$$;

CREATE TRIGGER "trg_stock_movements_no_update"
  BEFORE UPDATE OR DELETE ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION "guard_stock_movements_append_only"();

-- 4) Refinement #1 (every product has >= 1 standard variant): enforced in the
--    M2 service layer (createProduct always inserts the standard variant inside
--    one transaction; update guards reject deleting the last variant). A DB-level
--    trigger was evaluated and rejected: a self-referential row CHECK cannot see
--    its own table's other rows reliably, and an AFTER trigger would break the
--    same-transaction insert order used by seeds. Documented in DATA_MODEL.md.
