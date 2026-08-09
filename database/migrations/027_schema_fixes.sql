-- ============================================================================
-- MIGRATION 027: SCHEMA FIXES — Eliminar duplicaciones, constraints, índices
-- ============================================================================
-- Fecha: 2026-07-24
-- Propósito: Limpiar tablas muertas, agregar constraints faltantes, índices
-- Riesgo: Medio (DROP de tablas legacy — respaldar antes de ejecutar)
-- Rollback: Ver sección al final
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ELIMINAR TABLAS MUERTAS / DUPLICADAS
-- ============================================================================

-- 1.1 DROP `cart` legacy (001) — reemplazado por `carts` + `cart_items` (020)
-- Verificar que no hay datos activos primero
DO $$
BEGIN
  -- Solo dropear si la tabla existe y la nueva tabla de carts tiene datos
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart') THEN
    -- Backup: crear tabla temporal por si acaso
    CREATE TABLE IF NOT EXISTS _backup_cart_legacy AS SELECT * FROM cart;
    DROP TABLE IF EXISTS cart CASCADE;
    RAISE NOTICE '✅ Dropped legacy `cart` table (replaced by `carts` + `cart_items`)';
  END IF;
END $$;

-- 1.2 DROP `hero_settings` (003) — superseded por `hero_slides` (006)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'hero_settings') THEN
    CREATE TABLE IF NOT EXISTS _backup_hero_settings AS SELECT * FROM hero_settings;
    DROP TABLE IF EXISTS hero_settings CASCADE;
    RAISE NOTICE '✅ Dropped `hero_settings` (replaced by `hero_slides`)';
  END IF;
END $$;

-- 1.3 DROP `system_configurations` (026) — duplicado de `system_config` (001)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_configurations') THEN
    CREATE TABLE IF NOT EXISTS _backup_system_configurations AS SELECT * FROM system_configurations;
    DROP TABLE IF EXISTS system_configurations CASCADE;
    RAISE NOTICE '✅ Dropped `system_configurations` (using `system_config` instead)';
  END IF;
END $$;


-- ============================================================================
-- 2. CORREGIR TABLA `coupons` — Agregar columnas faltantes de v2
-- ============================================================================
-- La migración 026 intentó crear coupons v2 pero falló (IF NOT EXISTS + ya existía)
-- Necesitamos ALTER para agregar las columnas faltantes

DO $$
BEGIN
  -- Agregar company_id si no existe
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'company_id') THEN
    ALTER TABLE coupons ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added company_id to coupons';
  END IF;

  -- Agregar usage_limit si no existe
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'usage_limit') THEN
    ALTER TABLE coupons ADD COLUMN usage_limit INTEGER;
    RAISE NOTICE '✅ Added usage_limit to coupons';
  END IF;

  -- Agregar per_user_limit si no existe
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'per_user_limit') THEN
    ALTER TABLE coupons ADD COLUMN per_user_limit INTEGER;
    RAISE NOTICE '✅ Added per_user_limit to coupons';
  END IF;

  -- Agregar applies_to si no existe
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'applies_to') THEN
    ALTER TABLE coupons ADD COLUMN applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'products', 'categories', 'specific'));
    RAISE NOTICE '✅ Added applies_to to coupons';
  END IF;

  -- Agregar starts_at si no existe (renombrar de start_date si es necesario)
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'starts_at') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'start_date') THEN
      ALTER TABLE coupons RENAME COLUMN start_date TO starts_at;
      RAISE NOTICE '✅ Renamed start_date to starts_at in coupons';
    ELSE
      ALTER TABLE coupons ADD COLUMN starts_at TIMESTAMPTZ;
      RAISE NOTICE '✅ Added starts_at to coupons';
    END IF;
  END IF;

  -- Agregar expires_at si no existe (renombrar de end_date si es necesario)
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'expires_at') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'end_date') THEN
      ALTER TABLE coupons RENAME COLUMN end_date TO expires_at;
      RAISE NOTICE '✅ Renamed end_date to expires_at in coupons';
    ELSE
      ALTER TABLE coupons ADD COLUMN expires_at TIMESTAMPTZ;
      RAISE NOTICE '✅ Added expires_at to coupons';
    END IF;
  END IF;

  -- Agregar created_by si no existe
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'created_by') THEN
    ALTER TABLE coupons ADD COLUMN created_by UUID REFERENCES users(id);
    ALTER TABLE coupons ADD COLUMN deleted_at TIMESTAMPTZ;
    ALTER TABLE coupons ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE '✅ Added audit columns to coupons';
  END IF;
END $$;


-- ============================================================================
-- 3. CORREGIR TABLA `cash_registers` — Unificar esquema
-- ============================================================================

DO $$
BEGIN
  -- Agregar code si no existe
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cash_registers' AND column_name = 'code') THEN
    ALTER TABLE cash_registers ADD COLUMN code VARCHAR(50);
    -- Generar codes para registros existentes
    UPDATE cash_registers SET code = 'CAJA-' || SUBSTRING(id::text, 1, 8) WHERE code IS NULL;
    ALTER TABLE cash_registers ALTER COLUMN code SET NOT NULL;
    RAISE NOTICE '✅ Added code to cash_registers';
  END IF;

  -- Agregar deleted_at si no existe
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cash_registers' AND column_name = 'deleted_at') THEN
    ALTER TABLE cash_registers ADD COLUMN deleted_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added deleted_at to cash_registers';
  END IF;

  -- Agregar warehouse_id FK si no existe
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'cash_registers' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE cash_registers ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
    RAISE NOTICE '✅ Added warehouse_id FK to cash_registers';
  END IF;
END $$;


-- ============================================================================
-- 4. AGREGAR UNIQUE CONSTRAINTS FALTANTES
-- ============================================================================

-- 4.1 clients.email UNIQUE
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'clients_email_unique') THEN
    ALTER TABLE clients ADD CONSTRAINT clients_email_unique UNIQUE (email);
    RAISE NOTICE '✅ Added UNIQUE on clients.email';
  END IF;
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING '⚠️ Cannot add UNIQUE on clients.email — duplicate emails exist. Fix data first.';
END $$;

-- 4.2 clients.document_number UNIQUE (solo cuando no es null)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'clients_doc_number_unique') THEN
    ALTER TABLE clients ADD CONSTRAINT clients_doc_number_unique UNIQUE (document_number);
    RAISE NOTICE '✅ Added UNIQUE on clients.document_number';
  END IF;
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING '⚠️ Cannot add UNIQUE on clients.document_number — duplicates exist.';
END $$;

-- 4.3 products.barcode UNIQUE (solo cuando no es null)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'products_barcode_unique') THEN
    ALTER TABLE products ADD CONSTRAINT products_barcode_unique UNIQUE (barcode);
    RAISE NOTICE '✅ Added UNIQUE on products.barcode';
  END IF;
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING '⚠️ Cannot add UNIQUE on products.barcode — duplicates exist.';
END $$;


-- ============================================================================
-- 5. AGREGAR FOREIGN KEYS FALTANTES
-- ============================================================================

-- 5.1 cash_registers.company_id → companies.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.table_constraints 
    WHERE constraint_name = 'cash_registers_company_id_fk'
  ) THEN
    ALTER TABLE cash_registers ADD CONSTRAINT cash_registers_company_id_fk
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added FK cash_registers.company_id → companies';
  END IF;
END $$;

-- 5.2 cash_register_sessions.company_id → companies.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.table_constraints 
    WHERE constraint_name = 'cr_sessions_company_id_fk'
  ) THEN
    ALTER TABLE cash_register_sessions ADD CONSTRAINT cr_sessions_company_id_fk
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added FK cash_register_sessions.company_id → companies';
  END IF;
END $$;


-- ============================================================================
-- 6. AGREGAR ÍNDICES FALTANTES
-- ============================================================================

-- 6.1 Reportes por fecha
CREATE INDEX IF NOT EXISTS idx_sale_items_created_at ON sale_items(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

-- 6.2 Inventory multi-warehouse
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON inventory(warehouse_id);

-- 6.3 Product search by name
CREATE INDEX IF NOT EXISTS idx_products_name_gin ON products USING gin(name gin_trgm_ops);
-- Nota: Requiere extensión pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 6.4 Audit entity lookup
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_entity_id ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 6.5 Notifications pending
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, read) WHERE read = false;

-- 6.6 Expiring lots
CREATE INDEX IF NOT EXISTS idx_inventory_lots_expiry ON inventory_lots(expiry_date) WHERE expiry_date IS NOT NULL;

-- 6.7 Cash register active session
CREATE INDEX IF NOT EXISTS idx_cr_sessions_register_status ON cash_register_sessions(register_id, status) WHERE status = 'open';

-- 6.8 Cash register unique code per company
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'cash_registers_company_code_unique') THEN
    ALTER TABLE cash_registers ADD CONSTRAINT cash_registers_company_code_unique 
      UNIQUE (company_id, code);
    RAISE NOTICE '✅ Added UNIQUE (company_id, code) on cash_registers';
  END IF;
END $$;


-- ============================================================================
-- 7. CORREGIR COLUMNAS STATUS — Consolidar CHECK constraints
-- ============================================================================

-- 7.1 Agregar 'partial' a sales.payment_status si no existe
DO $$
BEGIN
  -- Primero dropear el CHECK existente
  ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_status_check;
  -- Recrear con valores completos
  ALTER TABLE sales ADD CONSTRAINT sales_payment_status_check 
    CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'failed'));
  RAISE NOTICE '✅ Updated sales.payment_status CHECK (added partial)';
END $$;

-- 7.2 Agregar 'archived' a categories.status si no existe
DO $$
BEGIN
  ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_status_check;
  ALTER TABLE categories ADD CONSTRAINT categories_status_check 
    CHECK (status IN ('active', 'inactive', 'archived'));
  RAISE NOTICE '✅ Updated categories.status CHECK (added archived)';
END $$;

-- 7.3 Consolidar products.status CHECK (remover duplicados de 001 y 014)
DO $$
BEGIN
  ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
  ALTER TABLE products ADD CONSTRAINT products_status_check 
    CHECK (status IN ('active', 'inactive', 'draft', 'archived'));
  RAISE NOTICE '✅ Consolidated products.status CHECK';
END $$;


-- ============================================================================
-- 8. AGREGAR AUDIT COLUMNS FALTANTES
-- ============================================================================

DO $$
BEGIN
  -- users.created_by / updated_by
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_by') THEN
    ALTER TABLE users ADD COLUMN created_by UUID REFERENCES users(id);
    ALTER TABLE users ADD COLUMN updated_by UUID REFERENCES users(id);
    RAISE NOTICE '✅ Added created_by, updated_by to users';
  END IF;

  -- roles audit columns
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'created_at') THEN
    ALTER TABLE roles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE roles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added audit columns to roles';
  END IF;

  -- warehouses.created_by
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'warehouses' AND column_name = 'created_by') THEN
    ALTER TABLE warehouses ADD COLUMN created_by UUID REFERENCES users(id);
    ALTER TABLE warehouses ADD COLUMN updated_by UUID REFERENCES users(id);
    RAISE NOTICE '✅ Added created_by, updated_by to warehouses';
  END IF;
END $$;


-- ============================================================================
-- 9. AUTO-UPDATED_AT TRIGGER PARA TABLAS QUE LO NECESITAN
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas que tienen updated_at pero quizás no tienen trigger
DO $$
DECLARE
  tbl TEXT;
  tables_with_updated_at TEXT[] := ARRAY[
    'users', 'clients', 'products', 'categories', 'brands',
    'inventory', 'purchases', 'purchase_items', 'sales', 'sale_items',
    'invoices', 'offers', 'coupons', 'promotions', 'product_variants',
    'cash_registers', 'cash_register_sessions', 'ecommerce_settings',
    'ecommerce_banners', 'hero_slides', 'floating_banners',
    'tax_rates', 'whatsapp_config', 'client_credit_accounts',
    'client_notification_preferences', 'product_reviews',
    'warehouses', 'warehouse_locations'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_updated_at LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
  RAISE NOTICE '✅ Applied updated_at triggers to all tables';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '⚠️ Some updated_at triggers already existed (skipped)';
END $$;


COMMIT;

-- ============================================================================
-- ROLLBACK STRATEGY
-- ============================================================================
-- Si algo falla después del COMMIT:
-- 
-- 1. Restaurar tablas desde backups:
--    INSERT INTO cart SELECT * FROM _backup_cart_legacy;
--    INSERT INTO hero_settings SELECT * FROM _backup_hero_settings;
--    INSERT INTO system_configurations SELECT * FROM _backup_system_configurations;
--
-- 2. Dropear constraints agregados:
--    ALTER TABLE coupons DROP CONSTRAINT IF EXISTS <nombre>;
--    ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_email_unique;
--    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_barcode_unique;
--
-- 3. Dropear columnas agregadas:
--    ALTER TABLE coupons DROP COLUMN IF EXISTS company_id;
--    ALTER TABLE coupons DROP COLUMN IF EXISTS usage_limit;
--    ... etc.
--
-- 4. Dropear índices:
--    DROP INDEX IF EXISTS idx_sale_items_created_at;
--    ... etc.
-- ============================================================================
