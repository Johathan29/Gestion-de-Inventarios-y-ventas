-- ===================================================
-- MIGRATION 055: Tablas base faltantes (outbox + pagos)
-- ===================================================
-- La migración 028 fue aplicada antes de que el archivo creciera,
-- por lo que transactional_outbox y payment_transactions nunca
-- se crearon en la base. Esta migración las crea para que la
-- migración 049 (sp_create_sale + outbox relay) funcione.
-- ===================================================

-- 1. TRANSACTIONAL OUTBOX — Eventos confiables post-transacción
-- ============================================================================
-- Patrón Outbox: los eventos se crean DENTRO de la misma transacción
-- que el negocio. Un worker (OutboxRelay) los procesa async.

CREATE TABLE IF NOT EXISTS transactional_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Evento
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,

  -- Payload (domain event serializado)
  payload JSONB NOT NULL,

  -- Metadata
  correlation_id UUID,
  caused_by_user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),

  -- Processing
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  last_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index
  CHECK (retry_count <= max_retries)
);

COMMENT ON TABLE transactional_outbox IS 'Transactional Outbox pattern. Eventos creados en la misma transacción que el negocio.';

-- 2. PAYMENT_TRANSACTIONS — Generic payment audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Referencia a la entidad que genera el pago
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,

  -- Datos del pago
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN (
    'cash', 'credit_card', 'debit_card', 'transfer', 'mobile',
    'check', 'credit', 'other'
  )),
  amount NUMERIC(15,4) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(3) DEFAULT 'USD' REFERENCES currencies(code),

  -- Referencia externa (pasarela de pago)
  gateway VARCHAR(50),
  gateway_transaction_id VARCHAR(200),
  gateway_response JSONB,

  -- Estado
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- Datos de tarjeta (tokenizados, NUNCA texto plano)
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),

  -- Auditoría
  created_by UUID REFERENCES users(id),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (reference_type IN ('sale', 'invoice', 'purchase', 'credit_note', 'return'))
);

COMMENT ON TABLE payment_transactions IS 'Trail de auditoría de pagos. NUNCA almacenar datos de tarjeta en texto plano.';

CREATE INDEX IF NOT EXISTS idx_payment_tx_reference ON payment_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_gateway ON payment_transactions(gateway, gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_company ON payment_transactions(company_id);
