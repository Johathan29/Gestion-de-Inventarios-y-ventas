-- ============================================================================
-- QUERY COMPLETA: ncf_sequences + fiscal_document_types (Multi-Tenant)
-- ============================================================================
-- Fecha: 2026-07-24
-- Propósito: Crear el sistema de secuencias NCF para facturación fiscal dominicana
--           con soporte multi-tenant (company_id en cada secuencia).
-- Aplicar en: Supabase SQL Editor → Nuevo Query → Pegar todo → Run
-- ============================================================================

-- ============================================================================
-- 1. TABLA: fiscal_document_types (prerequisito de ncf_sequences)
-- ============================================================================

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

-- ============================================================================
-- 2. TABLA: ncf_sequences (secuencias de numeración fiscal por empresa)
-- ============================================================================

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

-- Constraint adicional: una secuencia por empresa+tipo+prefijo (ya definido en 031)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'ncf_sequences_company_type_unique') THEN
    ALTER TABLE ncf_sequences ADD CONSTRAINT ncf_sequences_company_type_unique UNIQUE (company_id, prefix, branch);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. COLUMNAS en invoices (si no existen)
-- ============================================================================

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

-- ============================================================================
-- 4. ÍNDICES para performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ncf_sequences_company ON ncf_sequences(company_id);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_fiscal_type ON ncf_sequences(fiscal_document_type_id);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_active ON ncf_sequences(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_dates ON ncf_sequences(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_branch ON ncf_sequences(branch);
CREATE INDEX IF NOT EXISTS idx_invoices_ncf ON invoices(ncf) WHERE ncf != '';
CREATE INDEX IF NOT EXISTS idx_invoices_fiscal_type ON invoices(fiscal_document_type_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);

-- ============================================================================
-- 5. SEED DATA: Tipos de comprobante fiscal dominicano (DGII)
-- ============================================================================

INSERT INTO fiscal_document_types (code, name, type, prefix, is_active, requires_identification) VALUES
  -- Facturas
  ('B01', 'Factura para Consumo Final',            'consumer_final',  'B01', true, false),
  ('B02', 'Crédito Fiscal',                        'credit_fiscal',   'B02', true, true),
  ('B03', 'Gubernamental',                         'governmental',    'B03', true, true),
  ('B04', 'Regímenes Especiales',                  'special',         'B04', true, true),
  ('B14', 'Exportaciones',                         'export',          'B14', true, true),
  -- Notas
  ('B05', 'Nota de Crédito',                       'credit_note',     'B05', true, true),
  ('B06', 'Nota de Débito',                        'debit_note',      'B06', true, true),
  -- Anulaciones
  ('B07', 'Comprobante de Anulación',              'cancellation',    'B07', true, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 6. FUNCIÓN: Obtener siguiente NCF (multi-tenant)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_get_next_ncf(
  p_fiscal_document_type_id UUID,
  p_branch VARCHAR(100) DEFAULT '',
  p_company_id UUID DEFAULT NULL
)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_sequence RECORD;
  v_ncf VARCHAR(50);
  v_next_number INTEGER;
BEGIN
  -- Buscar secuencia activa para el tipo + sucursal + empresa
  SELECT * INTO v_sequence
  FROM ncf_sequences
  WHERE fiscal_document_type_id = p_fiscal_document_type_id
    AND branch = p_branch
    AND (p_company_id IS NULL OR company_id = p_company_id)
    AND is_active = true
    AND CURRENT_DATE BETWEEN valid_from AND valid_to
  ORDER BY company_id NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró una secuencia NCF activa para el tipo de documento % (sucursal: %)', p_fiscal_document_type_id, p_branch;
  END IF;

  IF v_sequence.current_number >= v_sequence.max_number THEN
    RAISE EXCEPTION 'La secuencia NCF % (%) ha alcanzado su límite (%)', v_sequence.prefix, v_sequence.serie, v_sequence.max_number;
  END IF;

  -- Incrementar número
  v_next_number := v_sequence.current_number + 1;

  UPDATE ncf_sequences
  SET current_number = v_next_number, updated_at = NOW()
  WHERE id = v_sequence.id;

  -- Formatear NCF: prefijo-00000001
  v_ncf := v_sequence.prefix || '-' || LPAD(v_next_number::TEXT, 8, '0');

  RETURN v_ncf;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCIÓN: Auto-generar NCF al crear factura (trigger)
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_generate_ncf()
RETURNS TRIGGER AS $$
DECLARE
  v_seq RECORD;
  v_ncf TEXT;
BEGIN
  -- Solo si no tiene NCF asignado
  IF NEW.ncf IS NULL OR NEW.ncf = '' THEN
    -- Obtener secuencia para el tipo de documento + empresa
    SELECT * INTO v_seq
    FROM ncf_sequences
    WHERE fiscal_document_type_id = NEW.fiscal_document_type_id
      AND branch = COALESCE(NEW.branch, '')
      AND (NEW.company_id IS NULL OR company_id = NEW.company_id)
      AND is_active = true
      AND CURRENT_DATE BETWEEN valid_from AND valid_to
      AND current_number < max_number
    ORDER BY company_id NULLS LAST
    LIMIT 1
    FOR UPDATE;

    IF v_seq IS NOT NULL THEN
      -- Incrementar número
      UPDATE ncf_sequences
      SET current_number = current_number + 1, updated_at = NOW()
      WHERE id = v_seq.id;

      -- Formatear NCF: prefijo-00000001
      v_ncf := v_seq.prefix || '-' || LPAD((v_seq.current_number + 1)::TEXT, 8, '0');
      NEW.ncf := v_ncf;
      NEW.ncf_sequence_id := v_seq.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trg_auto_ncf ON invoices;
CREATE TRIGGER trg_auto_ncf
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_ncf();

-- ============================================================================
-- 8. SEED DATA: Secuencias NCF para Empresa Default
-- ============================================================================

-- Obtener IDs de tipos de comprobante
DO $$
DECLARE
  v_company_id UUID := '00000000-0000-0000-0000-000000000001';
  v_fiscal_type RECORD;
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Crear secuencias para cada tipo de comprobante fiscal
  FOR v_fiscal_type IN SELECT id, code, prefix, name FROM fiscal_document_types WHERE is_active = true
  LOOP
    INSERT INTO ncf_sequences (
      company_id,
      fiscal_document_type_id,
      serie,
      prefix,
      current_number,
      max_number,
      valid_from,
      valid_to,
      is_active,
      branch
    ) VALUES (
      v_company_id,
      v_fiscal_type.id,
      v_fiscal_type.code,
      v_fiscal_type.prefix,
      0,
      25000000,  -- 25 millones de secuencias por tipo
      MAKE_DATE(v_year, 1, 1),
      MAKE_DATE(v_year, 12, 31),
      true,
      ''
    )
    ON CONFLICT (company_id, fiscal_document_type_id, serie, branch) DO NOTHING;

    RAISE NOTICE '✅ Secuencia NCF % (%) creada para empresa default', v_fiscal_type.code, v_fiscal_type.name;
  END LOOP;
END $$;

-- ============================================================================
-- 9. RLS POLICIES (Multi-Tenant)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE fiscal_document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncf_sequences ENABLE ROW LEVEL SECURITY;

-- fiscal_document_types: Solo lectura para todos, admin puede insertar
DROP POLICY IF EXISTS fiscal_document_types_select ON fiscal_document_types;
CREATE POLICY fiscal_document_types_select ON fiscal_document_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS fiscal_document_types_insert ON fiscal_document_types;
CREATE POLICY fiscal_document_types_insert ON fiscal_document_types
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

-- ncf_sequences: Filtrado por empresa
DROP POLICY IF EXISTS ncf_sequences_select ON ncf_sequences;
CREATE POLICY ncf_sequences_select ON ncf_sequences
  FOR SELECT TO authenticated USING (
    auth.user_role() IN ('admin', 'employee')
    AND auth.company_id() = company_id
  );

DROP POLICY IF EXISTS ncf_sequences_insert ON ncf_sequences;
CREATE POLICY ncf_sequences_insert ON ncf_sequences
  FOR INSERT TO authenticated WITH CHECK (
    auth.user_role() = 'admin'
    AND auth.company_id() = company_id
  );

DROP POLICY IF EXISTS ncf_sequences_update ON ncf_sequences;
CREATE POLICY ncf_sequences_update ON ncf_sequences
  FOR UPDATE TO authenticated USING (
    auth.user_role() = 'admin'
    AND auth.company_id() = company_id
  );

DROP POLICY IF EXISTS ncf_sequences_delete ON ncf_sequences;
CREATE POLICY ncf_sequences_delete ON ncf_sequences
  FOR DELETE TO authenticated USING (
    auth.user_role() = 'admin'
    AND auth.company_id() = company_id
  );

-- ============================================================================
-- 10. VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar tablas
SELECT 'fiscal_document_types' AS tabla, COUNT(*) AS registros FROM fiscal_document_types
UNION ALL
SELECT 'ncf_sequences', COUNT(*) FROM ncf_sequences
UNION ALL
SELECT 'invoices con ncf', COUNT(*) FROM invoices WHERE ncf IS NOT NULL AND ncf != '';

-- Verificar secuencias por empresa
SELECT
  c.name AS empresa,
  fdt.code AS tipo_ncf,
  fdt.name AS nombre,
  ns.prefix,
  ns.serie,
  ns.current_number,
  ns.max_number,
  ns.valid_from,
  ns.valid_to,
  ns.is_active
FROM ncf_sequences ns
JOIN companies c ON c.id = ns.company_id
JOIN fiscal_document_types fdt ON fdt.id = ns.fiscal_document_type_id
ORDER BY c.name, fdt.code;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Cada empresa crea sus propias secuencias NCF al registrarse
-- 2. Las secuencias se reinician anualmente (valid_from/valid_to por año)
-- 3. El prefijo B01-B07 corresponde a la DGII de República Dominicana
-- 4. La función fn_get_next_ncf() es ATÓMICA (usa FOR UPDATE)
-- 5. El trigger trg_auto_ncf asigna NCF automáticamente al crear factura
-- 6. Para crear secuencias para una nueva empresa:
--    INSERT INTO ncf_sequences (company_id, fiscal_document_type_id, serie, prefix, current_number, max_number, valid_from, valid_to, is_active, branch)
--    VALUES ('<company_uuid>', '<fiscal_type_uuid>', 'B01', 'B01', 0, 25000000, '2026-01-01', '2026-12-31', true, '');
-- ============================================================================
