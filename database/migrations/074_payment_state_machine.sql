-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 074 — PAYMENT STATE MACHINE (Fase 6)
-- Objetivo: alinear payment_transactions.status a la máquina de estados
-- formal (docs/payments/PAYMENT-STATE-MACHINE.md):
--   pending, authorized, captured, failed, cancelled, expired,
--   refunded, partially_refunded
-- CAMBIOS (aditivos + data migration):
--   1. Migrar 'completed' → 'captured' (estado objetivo)
--   2. Nuevo CHECK con la máquina de estados formal
--   3. Timestamps de transición (authorized_at, captured_at, refunded_at) + TTL (expires_at)
--   4. Tabla payment_webhook_events (dedup de webhooks: idempotencia + replay protection)
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Quitar el CHECK viejo ANTES de migrar datos (evita violación)
ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_status_check;

-- 2. Migrar 'completed' → 'captured' (el cobro efectivo es la captura)
UPDATE payment_transactions
   SET status = 'captured'
 WHERE status = 'completed';

-- 3. Nuevo CHECK de estados (máquina de estados formal)
ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transactions_status_check
  CHECK (status IN (
    'pending', 'authorized', 'captured', 'failed',
    'cancelled', 'expired', 'refunded', 'partially_refunded'
  ));

-- 4. Timestamps de transición + TTL de expiración + updated_at (auditoría)
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN payment_transactions.updated_at IS 'Última actualización (auditoría)';
COMMENT ON COLUMN payment_transactions.authorized_at IS 'Momento de autorización por la pasarela';
COMMENT ON COLUMN payment_transactions.captured_at IS 'Momento de captura (cobro efectivo)';
COMMENT ON COLUMN payment_transactions.refunded_at IS 'Momento de devolución (refund)';
COMMENT ON COLUMN payment_transactions.expires_at IS 'TTL de expiración para pagos pendientes (15 min)';

-- 4. Dedup de webhooks de pago (idempotencia + replay protection)
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  transaction_id UUID,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

COMMENT ON TABLE payment_webhook_events IS
  'Dedup de webhooks de pago: un event_id se procesa una sola vez (idempotencia) y permite rechazar replays (ventana de 5 min).';

-- RLS: solo lectura/inserción vía service role (nunca cliente)
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pwe_select ON payment_webhook_events;
DROP POLICY IF EXISTS pwe_insert ON payment_webhook_events;
CREATE POLICY pwe_select ON payment_webhook_events FOR SELECT USING (true);
CREATE POLICY pwe_insert ON payment_webhook_events FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_tx ON payment_webhook_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_expires ON payment_transactions(expires_at)
  WHERE status = 'pending';
