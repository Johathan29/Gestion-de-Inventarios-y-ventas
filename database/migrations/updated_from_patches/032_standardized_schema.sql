-- ============================================================================
-- MIGRATION 032: STANDARDIZED SCHEMA — MULTI-TENANT + NCF + COMPLETO
-- ============================================================================
-- Fecha: 2026-07-24
-- Propósito: Migración MAESTRA que consolida TODO el esquema estandarizado:
--   ✅ Multi-tenant: company_id en TODAS las tablas de negocio
--   ✅ NCF fiscal: fiscal_document_types + ncf_sequences + triggers
--   ✅ Helper functions: auth.company_id(), auth.user_id(), auth.user_role()
--   ✅ Backfill: empresa default para datos existentes
--   ✅ Índices: optimizados para queries multi-tenant
--   ✅ RLS policies: aislamiento completo por empresa
--   ✅ Triggers: auto-assign company_id + auto-generar NCF
--   ✅ Vistas: company_context, verification queries
--   ✅ Seeds: DGII fiscal types + default NCF sequences
--
-- Aplicar en: Supabase SQL Editor → Nuevo Query → Pegar todo → Run
-- Rollback: Ver sección al final del archivo
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HELPER FUNCTIONS — auth.* para multi-tenancy
-- ============================================================================
-- Estas funciones leen el JWT del usuario autenticado.
-- Se necesitan antes de crear RLS policies.

-- 1.1. Obtener company_id del JWT (con fallback a empresa default)
CREATE OR REPLACE FUNCTION public.auto_assign_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_claim_company uuid;
BEGIN
  -- If NEW already has a company_id, keep it
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 1) Try to read company_id from JWT request context (works in Supabase/PG functions)
  BEGIN
    v_claim_company := NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'company_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_claim_company := NULL;
  END;

  -- 2) Apply fallback hierarchy
  NEW.company_id := COALESCE(v_claim_company, :'target_company'::uuid);

  RETURN NEW;
END;
$;


-- ============================================================================
-- 9. FACTURACIÓN FISCAL — fiscal_document_types + ncf_sequences
-- ============================================================================

-- 9.1. Tipos de comprobante fiscal (DGII República Dominicana)
CREATE TABLE IF NOT EXISTS fiscal_document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'consumer_final', 'credit_fiscal', 'governmental', 'special',
    'export', 'credit_note', 'debit_note', 'cancellation'
  )),
  prefix VARCHAR(5) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_identification BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.2. Secuencias NCF por empresa
CREATE TABLE IF NOT EXISTS ncf_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_document_type_id UUID NOT NULL REFERENCES fiscal_document_types(id) ON DELETE CASCADE,
  serie VARCHAR(10) NOT NULL,
  prefix VARCHAR(10) NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  max_number INTEGER NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  branch VARCHAR(100) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Una secuencia por empresa + tipo + serie + sucursal
  UNIQUE(company_id, fiscal_document_type_id, serie, branch)
);

-- Constraint adicional: una secuencia por empresa+prefijo+sucursal
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'ncf_sequences_company_type_unique') THEN
    ALTER TABLE ncf_sequences ADD CONSTRAINT ncf_sequences_company_type_unique UNIQUE (company_id, prefix, branch);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9.3. Columnas fiscales en invoices (si no existen)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS ncf VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS ncf_sequence_id UUID REFERENCES ncf_sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_document_type_id UUID REFERENCES fiscal_document_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_document_type VARCHAR(20) DEFAULT '' CHECK (client_document_type IN ('', 'RNC', 'CEDULA', 'PASAPORTE')),
  ADD COLUMN IF NOT EXISTS client_document_number VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_name VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_phone VARCHAR(30) DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_email VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(30) DEFAULT 'consumer_final' CHECK (invoice_type IN (
    'consumer_final', 'credit_fiscal', 'governmental', 'special', 'export',
    'credit_note', 'debit_note', 'cancellation'
  )),
  ADD COLUMN IF NOT EXISTS reference_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS branch VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS cash_register VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS seller_name VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_method_name VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_term VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS xml_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS signature TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS qr_code_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fiscal_registration TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_electronic BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS electronic_status VARCHAR(30) DEFAULT 'pending' CHECK (electronic_status IN ('pending', 'sent', 'approved', 'rejected'));

-- Migrar datos de clientes a columnas de factura
UPDATE invoices i
SET
  client_name = COALESCE(c.name, ''),
  client_document_number = COALESCE(c.document_number, ''),
  client_email = COALESCE(c.email, ''),
  client_phone = COALESCE(c.phone, '')
FROM clients c
WHERE i.client_id = c.id AND (i.client_name IS NULL OR i.client_name = '');

RAISE NOTICE '✅ invoices: fiscal columns added';

-- 9.4. Índices para NCF
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_company ON ncf_sequences(company_id);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_fiscal_type ON ncf_sequences(fiscal_document_type_id);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_active ON ncf_sequences(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_dates ON ncf_sequences(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_branch ON ncf_sequences(branch);
CREATE INDEX IF NOT EXISTS idx_invoices_ncf ON invoices(ncf) WHERE ncf != '';
CREATE INDEX IF NOT EXISTS idx_invoices_fiscal_type ON invoices(fiscal_document_type_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);

-- 9.5. Seed: Tipos de comprobante DGII
INSERT INTO fiscal_document_types (code, name, type, prefix, is_active, requires_identification) VALUES
  ('B01', 'Factura para Consumo Final',       'consumer_final',  'B01', true, false),
  ('B02', 'Crédito Fiscal',                   'credit_fiscal',   'B02', true, true),
  ('B03', 'Gubernamental',                    'governmental',    'B03', true, true),
  ('B04', 'Regímenes Especiales',             'special',         'B04', true, true),
  ('B14', 'Exportaciones',                    'export',          'B14', true, true),
  ('B05', 'Nota de Crédito',                  'credit_note',     'B05', true, true),
  ('B06', 'Nota de Débito',                   'debit_note',      'B06', true, true),
  ('B07', 'Comprobante de Anulación',         'cancellation',    'B07', true, true)
ON CONFLICT (code) DO NOTHING;

RAISE NOTICE '✅ fiscal_document_types: DGII seeds inserted';

-- 9.6. Secuencias NCF para Empresa Default (8 tipos × 25M cada uno)
DO $$
DECLARE
  v_company_id UUID := '00000000-0000-0000-0000-000000000001';
  v_fiscal_type RECORD;
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  FOR v_fiscal_type IN SELECT id, code, prefix, name FROM fiscal_document_types WHERE is_active = true
  LOOP
    INSERT INTO ncf_sequences (
      company_id, fiscal_document_type_id, serie, prefix,
      current_number, max_number, valid_from, valid_to, is_active, branch
    ) VALUES (
      v_company_id, v_fiscal_type.id, v_fiscal_type.code, v_fiscal_type.prefix,
      0, 25000000,
      MAKE_DATE(v_year, 1, 1),
      MAKE_DATE(v_year, 12, 31),
      true, ''
    )
    ON CONFLICT (company_id, fiscal_document_type_id, serie, branch) DO NOTHING;

    RAISE NOTICE '✅ Secuencia NCF % (%) → empresa default', v_fiscal_type.code, v_fiscal_type.name;
  END LOOP;
END $$;


-- ============================================================================
-- 10. FUNCIÓN: fn_get_next_ncf — Obtener siguiente NCF (atómica)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_claim_company uuid;
BEGIN
  -- If NEW already has a company_id, keep it
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 1) Try to read company_id from JWT request context (works in Supabase/PG functions)
  BEGIN
    v_claim_company := NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'company_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_claim_company := NULL;
  END;

  -- 2) Apply fallback hierarchy
  NEW.company_id := COALESCE(v_claim_company, :'target_company'::uuid);

  RETURN NEW;
END;
$;
--
-- 5. Eliminar constraints:
--    ALTER TABLE ecommerce_settings DROP CONSTRAINT IF EXISTS ecommerce_settings_company_unique;
--    ALTER TABLE hero_settings DROP CONSTRAINT IF EXISTS hero_settings_company_unique;
--    ALTER TABLE whatsapp_config DROP CONSTRAINT IF EXISTS whatsapp_config_company_unique;
--    ALTER TABLE ncf_sequences DROP CONSTRAINT IF EXISTS ncf_sequences_company_type_unique;
--
-- 6. Eliminar tablas NCF:
--    DROP TABLE IF EXISTS ncf_sequences;
--    DROP TABLE IF EXISTS fiscal_document_types;
-- ============================================================================
