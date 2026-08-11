-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 070 — FASE 7: SNAPSHOT FISCAL invoice_items
-- -----------------------------------------------------------------------
-- Objetivo: los items de la factura pasan a una tabla propia con SNAPSHOT
-- inmutable (nombre, SKU, precio, impuestos) en el momento de la venta.
-- Antes se leían dinámicamente de sale_items; si el producto cambiaba,
-- la factura histórica cambiaba → riesgo fiscal.
--
-- CAMBIOS:
--   1. CREATE TABLE invoice_items (snapshot + vínculos)
--   2. Índice único parcial por sale_item_id → backfill idempotente
--   3. RLS + política tenant_access (mismo patrón que 062)
--   4. Trigger trg_auto_company_id (mismo patrón que 061)
--   5. BACKFILL desde invoices JOIN sale_items (ON CONFLICT DO NOTHING)
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Tabla de snapshot fiscal
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  product_id UUID,
  description TEXT NOT NULL,          -- snapshot del nombre del producto
  sku VARCHAR(100),                   -- snapshot del SKU
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL,  -- snapshot del precio
  discount NUMERIC(14,2) DEFAULT 0,
  tax NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) NOT NULL,
  variant_id UUID,
  variant_name VARCHAR(255),
  variant_attributes JSONB,
  company_id UUID NOT NULL REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE invoice_items IS 'Snapshot fiscal inmutable de los items de cada factura (Fase 7)';
COMMENT ON COLUMN invoice_items.description IS 'Nombre del producto en el momento de la venta (snapshot)';
COMMENT ON COLUMN invoice_items.unit_price IS 'Precio unitario en el momento de la venta (snapshot)';

-- 2. Índices (unique parcial → backfill/re-insert idempotente)
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_items_sale_item
  ON invoice_items(sale_item_id) WHERE sale_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_company_id ON invoice_items(company_id);

-- 3. RLS (defensa en profundidad; el gateway usa service_role y la salta)
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_access_invoice_items ON invoice_items;
CREATE POLICY tenant_access_invoice_items ON invoice_items
  USING (company_id = COALESCE((current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid, '00000000-0000-0000-0000-000000000001'::uuid))
  WITH CHECK (company_id = COALESCE((current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid, '00000000-0000-0000-0000-000000000001'::uuid));

-- 4. Trigger auto company_id (BEFORE INSERT; solo si NEW.company_id IS NULL)
DROP TRIGGER IF EXISTS trg_auto_company_id ON invoice_items;
CREATE TRIGGER trg_auto_company_id BEFORE INSERT ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id();

-- 5. BACKFILL: items históricos de invoices que tienen sale_items
INSERT INTO invoice_items (
  invoice_id, sale_item_id, product_id, description, sku,
  quantity, unit_price, discount, tax, total,
  variant_id, variant_name, variant_attributes, company_id
)
SELECT
  i.id, si.id, si.product_id, si.product_name, si.sku,
  si.quantity, si.unit_price, si.discount, si.tax, si.total,
  si.variant_id, si.variant_name, si.variant_attributes,
  COALESCE(i.company_id, si.company_id)
FROM invoices i
JOIN sale_items si ON si.sale_id = i.sale_id
ON CONFLICT (sale_item_id) WHERE sale_item_id IS NOT NULL DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';
