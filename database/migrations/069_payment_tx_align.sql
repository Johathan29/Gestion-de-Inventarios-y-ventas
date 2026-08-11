-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 069 — ALINEAR payment_transactions al contracto del
-- payment-service (Fase 5). La tabla fue creada por 028/055 como audit
-- trail genérico (reference_type/reference_id/payment_method), pero el
-- servicio hexagonal espera columnas de dominio (sale_id, invoice_id,
-- payment_method_id, notes, processed_by/at, reference, ...).
-- CAMBIOS (todos aditivos):
--   1. Nuevas columnas de dominio
--   2. FK payment_method_id → payment_methods (habilita joins embebidos)
--   3. Relajar NOT NULL / CHECK de auditoría (único escritor: el servicio)
--   4. Índices útiles
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Columnas de dominio que espera el payment-service
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS sale_id UUID,
  ADD COLUMN IF NOT EXISTS invoice_id UUID,
  ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id),
  ADD COLUMN IF NOT EXISTS payment_method_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN payment_transactions.sale_id IS 'Venta asociada (dominio)';
COMMENT ON COLUMN payment_transactions.invoice_id IS 'Factura asociada (dominio)';

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_payment_tx_sale ON payment_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_method ON payment_transactions(payment_method_id);

-- 3. Relajar constraints de auditoría: el payment-service inserta usando
--    el schema de dominio; los campos de auditoría quedan opcionales.
ALTER TABLE payment_transactions ALTER COLUMN reference_type DROP NOT NULL;
ALTER TABLE payment_transactions ALTER COLUMN reference_id DROP NOT NULL;
ALTER TABLE payment_transactions ALTER COLUMN payment_method DROP NOT NULL;

-- 4. El CHECK de payment_method lista códigos viejos ('credit_card'...) pero
--    el catálogo real es payment_methods.code ('card_debit', 'card_credit'...).
--    Se reemplaza por un CHECK amplio para no romper insert del servicio.
ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_payment_method_check;
ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transactions_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN (
    'cash', 'card', 'card_debit', 'card_credit', 'credit_card', 'debit_card',
    'transfer', 'mobile', 'check', 'credit', 'wallet', 'other'
  ));
