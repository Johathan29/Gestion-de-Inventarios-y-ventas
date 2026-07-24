-- ============================================================
-- Migration 017: Add invoice_id to sales + Trigger + Generic Client
-- ============================================================
-- Propósito:
--   1. Agregar columna invoice_id a la tabla sales (relación inversa)
--   2. Crear trigger que actualice automáticamente sales.invoice_id
--      cuando se inserta/actualiza una factura con sale_id
--   3. Asegurar que exista un cliente genérico "Consumidor Final"
--      para ventas de punto de venta (POS) sin cliente registrado
-- ============================================================

-- ============================================================
-- 1. Agregar columna invoice_id a sales
-- ============================================================
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

COMMENT ON COLUMN sales.invoice_id IS 'Factura asociada a esta venta (relación inversa)';

CREATE INDEX IF NOT EXISTS idx_sales_invoice_id ON sales(invoice_id);

-- ============================================================
-- 2. Función trigger: actualiza sales.invoice_id automáticamente
--    cuando se inserta o actualiza una factura con sale_id
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_sale_invoice_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la factura tiene un sale_id, actualizamos la venta correspondiente
  IF NEW.sale_id IS NOT NULL THEN
    UPDATE sales
    SET invoice_id = NEW.id,
        updated_at = NOW()
    WHERE id = NEW.sale_id;
  END IF;

  -- Si el sale_id cambió (UPDATE), limpiar la venta anterior
  IF TG_OP = 'UPDATE' AND OLD.sale_id IS DISTINCT FROM NEW.sale_id AND OLD.sale_id IS NOT NULL THEN
    UPDATE sales
    SET invoice_id = NULL,
        updated_at = NOW()
    WHERE id = OLD.sale_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe para recrearlo limpio
DROP TRIGGER IF EXISTS trg_invoice_update_sale_invoice_id ON invoices;

-- Crear trigger AFTER INSERT OR UPDATE
CREATE TRIGGER trg_invoice_update_sale_invoice_id
  AFTER INSERT OR UPDATE OF sale_id ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_sale_invoice_id();

-- ============================================================
-- 3. Trigger complementario: al cancelar/anular una factura,
--    limpiamos la referencia en sales (opcional pero recomendado)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_clear_sale_invoice_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la factura se cancela o anula, limpiamos la referencia en sales
  -- para permitir generar una nueva factura si es necesario
  IF NEW.status IN ('cancelled', 'voided') AND OLD.status NOT IN ('cancelled', 'voided') THEN
    IF NEW.sale_id IS NOT NULL THEN
      UPDATE sales
      SET invoice_id = NULL,
          updated_at = NOW()
      WHERE id = NEW.sale_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_clear_sale_reference ON invoices;

CREATE TRIGGER trg_invoice_clear_sale_reference
  AFTER UPDATE OF status ON invoices
  FOR EACH ROW
  WHEN (NEW.status IN ('cancelled', 'voided'))
  EXECUTE FUNCTION fn_clear_sale_invoice_on_cancel();

-- ============================================================
-- 4. Asegurar que exista un cliente genérico "Consumidor Final"
--    para ventas POS sin cliente registrado
-- ============================================================
INSERT INTO clients (name, document_type, document_number, is_active, notes)
SELECT 'Consumidor Final', 'CEDULA', '0000000000', true, 'Cliente genérico para ventas POS sin identificación'
WHERE NOT EXISTS (
  SELECT 1 FROM clients
  WHERE document_number = '0000000000' OR name = 'Consumidor Final'
);

-- ============================================================
-- 5. NOTA: La función autoCreateInvoice en sale-service ya maneja
--    el caso cuando clientId es null. Si se desea usar explícitamente
--    el cliente genérico, el servicio debe buscarlo:
--
--    SELECT id FROM clients WHERE document_number = '0000000000' LIMIT 1
--
--    Esto se puede implementar en el backend si se requiere.
-- ============================================================
