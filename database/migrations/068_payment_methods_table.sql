-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 068 — TABLA payment_methods (referencia, sin company_id)
-- La migración 014 definió esta tabla pero no quedó creada en esta base
-- (el payment-service la consulta vía findByCode → PAYMENT_METHOD_NOT_FOUND).
-- Se recrea con los seeds por defecto del ERP.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('cash', 'card', 'transfer', 'check', 'credit', 'wallet', 'other')),
  is_active BOOLEAN DEFAULT true,
  requires_reference BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payment_methods IS 'Catálogo de métodos de pago (tabla de referencia global, sin company_id)';

-- Seeds por defecto (igual que 014)
INSERT INTO payment_methods (code, name, type, requires_reference) VALUES
  ('cash', 'Efectivo', 'cash', false),
  ('card_debit', 'Tarjeta de Débito', 'card', true),
  ('card_credit', 'Tarjeta de Crédito', 'card', true),
  ('transfer', 'Transferencia Bancaria', 'transfer', true),
  ('check', 'Cheque', 'check', true)
ON CONFLICT (code) DO NOTHING;

-- RLS (igual que 029/039): lectura pública
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_payment_methods" ON public.payment_methods;
CREATE POLICY "public_payment_methods" ON public.payment_methods
  FOR SELECT USING (true);
