-- ============================================================================
-- MIGRATION 028: INVENTORY LEDGER + CORE TABLES
-- ============================================================================
-- Fecha: 2026-07-24
-- Propósito: Tablas core del patrón Ledger, outbox, branches
-- Riesgo: Bajo (solo CREATE TABLE, no modifica existentes)
-- Rollback: DROP de las tablas creadas
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. EXTENSIONES NECESARIAS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ============================================================================
-- 2. BRANCHES — Multi-tenant branch/office definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'DO',
  phone VARCHAR(30),
  email VARCHAR(200),
  manager_name VARCHAR(200),
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, code)
);

COMMENT ON TABLE branches IS 'Sucursales/oficinas de la empresa (multi-tenant)';
COMMENT ON COLUMN branches.is_main IS 'Sucursal principal (matriz)';


-- ============================================================================
-- 3. INVENTORY LEDGER — Fuente única de verdad de inventario
-- ============================================================================
---append-only ledger. NUNCA se actualiza ni se borra.
-- El stock actual se deriva de SUM de movimientos.

CREATE TABLE IF NOT EXISTS inventory_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Referencia al producto
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  
  -- Lote y serie (opcional)
  lot_id UUID REFERENCES inventory_lots(id) ON DELETE SET NULL,
  serial_number VARCHAR(100),
  
  -- Tipo de movimiento (controlado, NO libre)
  movement_type VARCHAR(40) NOT NULL CHECK (movement_type IN (
    'PURCHASE_RECEIPT',        -- Recepción de compra
    'SALE',                    -- Salida por venta
    'SALE_RETURN',             -- Devolución de cliente (entrada)
    'PURCHASE_RETURN',         -- Devolución a proveedor (salida)
    'RESERVATION',             -- Reservar stock (sale)
    'RESERVATION_RELEASE',     -- Liberar reserva (cancelación)
    'RESERVATION_CONSUME',     -- Consumir reserva (despacho)
    'ADJUSTMENT_IN',           -- Ajuste positivo
    'ADJUSTMENT_OUT',          -- Ajuste negativo
    'TRANSFER_IN',             -- Transferencia entrada
    'TRANSFER_OUT',            -- Transferencia salida
    'PHYSICAL_COUNT',          -- Conteo físico
    'EXPIRATION',              -- Vencimiento
    'OPENING',                 -- Stock inicial
    'INTERNAL_CONSUMPTION'     -- Consumo interno
  )),
  
  -- Cantidades y costos
  quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(15,4) DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost NUMERIC(15,4) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  
  -- Balances previos y nuevos (snapshot para auditoría)
  previous_balance NUMERIC(15,4) NOT NULL DEFAULT 0,
  new_balance NUMERIC(15,4) NOT NULL,
  
  -- Referencia a la entidad origen
  reference_type VARCHAR(50),  -- 'purchase', 'sale', 'transfer', 'adjustment', etc.
  reference_id UUID,           -- ID de la entidad origen
  
  -- Contexto
  reason TEXT,
  notes TEXT,
  
  -- Auditoría
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  correlation_id UUID,  -- Para trazabilidad cross-service
  
  -- Timestamp (inmutable)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (quantity > 0),
  CHECK (previous_balance >= 0),
  CHECK (new_balance >= 0),
  CHECK (
    (movement_type IN ('SALE', 'PURCHASE_RETURN', 'TRANSFER_OUT', 'ADJUSTMENT_OUT', 'RESERVATION', 'EXPIRATION', 'INTERNAL_CONSUMPTION') 
     AND new_balance = previous_balance - quantity)
    OR
    (movement_type IN ('PURCHASE_RECEIPT', 'SALE_RETURN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'OPENING') 
     AND new_balance = previous_balance + quantity)
    OR
    (movement_type IN ('RESERVATION_RELEASE', 'RESERVATION_CONSUME', 'PHYSICAL_COUNT')
     AND new_balance >= 0)
  )
);

COMMENT ON TABLE inventory_ledger IS 'Ledger inmutable de inventario. Fuente única de verdad. NUNCA UPDATE/DELETE.';
COMMENT ON COLUMN inventory_ledger.movement_type IS 'Tipo controlado de movimiento. Usar solo valores del CHECK constraint.';
COMMENT ON COLUMN inventory_ledger.previous_balance IS 'Stock antes de este movimiento (snapshot)';
COMMENT ON COLUMN inventory_ledger.new_balance IS 'Stock después de este movimiento (snapshot)';

-- Índices para el ledger
CREATE INDEX IF NOT EXISTS idx_ledger_product ON inventory_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_ledger_product_warehouse ON inventory_ledger(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ledger_warehouse ON inventory_ledger(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ledger_movement_type ON inventory_ledger(movement_type);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON inventory_ledger(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON inventory_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_company ON inventory_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_ledger_lot ON inventory_ledger(lot_id) WHERE lot_id IS NOT NULL;

-- Índice para kardex (consulta más común)
CREATE INDEX IF NOT EXISTS idx_ledger_kardex ON inventory_ledger(product_id, warehouse_id, created_at DESC);


-- ============================================================================
-- 4. INVENTORY BALANCES — Vista materializada de saldos
-- ============================================================================
-- Se actualiza mediante TRIGGER después de cada inserción en ledger.

CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_balances AS
SELECT 
  product_id,
  variant_id,
  warehouse_id,
  lot_id,
  
  -- Stock actual = SUM(entradas) - SUM(salidas)
  SUM(CASE 
    WHEN movement_type IN ('PURCHASE_RECEIPT', 'SALE_RETURN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'OPENING', 'RESERVATION_RELEASE') 
    THEN quantity 
    ELSE 0 
  END) - SUM(CASE 
    WHEN movement_type IN ('SALE', 'PURCHASE_RETURN', 'TRANSFER_OUT', 'ADJUSTMENT_OUT', 'EXPIRATION', 'RESERVATION_CONSUME', 'INTERNAL_CONSUMPTION') 
    THEN quantity 
    ELSE 0 
  END) AS quantity_on_hand,
  
  -- Stock reservado
  SUM(CASE 
    WHEN movement_type = 'RESERVATION' AND correlation_id IS NOT NULL
    THEN quantity 
    ELSE 0 
  END) AS quantity_reserved,
  
  -- Disponible = en mano - reservado
  SUM(CASE 
    WHEN movement_type IN ('PURCHASE_RECEIPT', 'SALE_RETURN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'OPENING', 'RESERVATION_RELEASE') 
    THEN quantity 
    ELSE 0 
  END) - SUM(CASE 
    WHEN movement_type IN ('SALE', 'PURCHASE_RETURN', 'TRANSFER_OUT', 'ADJUSTMENT_OUT', 'EXPIRATION', 'RESERVATION_CONSUME', 'INTERNAL_CONSUMPTION') 
    THEN quantity 
    ELSE 0 
  END) - SUM(CASE 
    WHEN movement_type = 'RESERVATION' AND correlation_id IS NOT NULL
    THEN quantity 
    ELSE 0 
  END) AS quantity_available,
  
  -- Costos
  CASE 
    WHEN SUM(CASE WHEN unit_cost > 0 THEN quantity ELSE 0 END) > 0
    THEN SUM(unit_cost * CASE WHEN unit_cost > 0 THEN quantity ELSE 0 END) / SUM(CASE WHEN unit_cost > 0 THEN quantity ELSE 0 END)
    ELSE 0 
  END AS average_cost,
  
  -- Último costo
  (SELECT il.unit_cost FROM inventory_ledger il 
   WHERE il.product_id = ledger.product_id 
     AND il.warehouse_id = ledger.warehouse_id 
     AND il.unit_cost > 0
   ORDER BY il.created_at DESC LIMIT 1) AS last_cost,
  
  -- Metadata
  MAX(created_at) AS last_movement_at,
  (SELECT movement_type FROM inventory_ledger il 
   WHERE il.product_id = ledger.product_id 
     AND il.warehouse_id = ledger.warehouse_id
   ORDER BY il.created_at DESC LIMIT 1) AS last_movement_type

FROM inventory_ledger ledger
GROUP BY product_id, variant_id, warehouse_id, lot_id
WITH DATA;

COMMENT ON MATERIALIZED VIEW inventory_balances IS 'Vista materializada de saldos de inventario. Refrescar después de cada batch de inserciones.';

-- Unique index para poder refrescar concurrentemente
CREATE UNIQUE INDEX IF NOT EXISTS idx_balances_unique 
  ON inventory_balances(product_id, warehouse_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(lot_id, '00000000-0000-0000-0000-000000000000'::uuid));


-- ============================================================================
-- 5. TRANSACTIONAL OUTBOX — Eventos confiables post-transacción
-- ============================================================================
-- Patrón Outbox: los eventos se crean DENTRO de la misma transacción
-- que el negocio. Un worker los procesa async.

CREATE TABLE IF NOT EXISTS transactional_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Evento
  event_type VARCHAR(100) NOT NULL,  -- 'SaleConfirmed', 'PurchaseReceived', 'InventoryAdjusted', etc.
  aggregate_type VARCHAR(50) NOT NULL,  -- 'sale', 'purchase', 'inventory', 'invoice'
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
COMMENT ON COLUMN transactional_outbox.status IS 'pending → processing → published | failed';

-- Índices para el worker
CREATE INDEX IF NOT EXISTS idx_outbox_status_pending 
  ON transactional_outbox(created_at ASC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_status_failed 
  ON transactional_outbox(created_at ASC) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate 
  ON transactional_outbox(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_outbox_event_type 
  ON transactional_outbox(event_type);
CREATE INDEX IF NOT EXISTS idx_outbox_correlation 
  ON transactional_outbox(correlation_id) WHERE correlation_id IS NOT NULL;


-- ============================================================================
-- 6. DEBIT_NOTES — Notas de débito (counterpart to credit_notes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS debit_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  debit_note_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Referencia
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Contenido
  reason TEXT NOT NULL,
  
  -- Montos
  subtotal NUMERIC(15,4) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  
  -- Estado
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  
  -- Auditoría
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE debit_notes IS 'Notas de débito. Incremento de factura.';

CREATE TABLE IF NOT EXISTS debit_note_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debit_note_id UUID NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  
  quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(15,4) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(15,4) NOT NULL,
  
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debit_notes_company ON debit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_invoice ON debit_notes(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debit_notes_client ON debit_notes(client_id) WHERE client_id IS NOT NULL;


-- ============================================================================
-- 7. CURRENCIES — Currency definitions (ISO codes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(3) UNIQUE NOT NULL,   -- ISO 4217: USD, DOP, EUR, COP
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE currencies IS 'Definiciones de moneda ISO 4217';

-- Seed data
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
  ('USD', 'US Dollar', '$', 2),
  ('DOP', 'Dominican Peso', 'RD$', 2),
  ('EUR', 'Euro', '€', 2),
  ('COP', 'Colombian Peso', '$', 2),
  ('MXN', 'Mexican Peso', '$', 2),
  ('VES', 'Venezuelan Bolívar', 'Bs.S', 2)
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- 8. PAYMENT_TRANSACTIONS — Generic payment audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Referencia a la entidad que genera el pago
  reference_type VARCHAR(50) NOT NULL,  -- 'sale', 'invoice', 'purchase'
  reference_id UUID NOT NULL,
  
  -- Datos del pago
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN (
    'cash', 'credit_card', 'debit_card', 'transfer', 'mobile',
    'check', 'credit', 'other'
  )),
  amount NUMERIC(15,4) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(3) DEFAULT 'USD' REFERENCES currencies(code),
  
  -- Referencia externa (pasarela de pago)
  gateway VARCHAR(50),            -- 'stripe', 'paypal', 'banco'
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


-- ============================================================================
-- 9. ACTUALIZAR INVENTORY para apuntar a warehouse_id (FK)
-- ============================================================================
-- La columna `warehouse` (VARCHAR) es legacy. Agregar FK a warehouse_id si falta.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_warehouse_id_fk'
  ) THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_warehouse_id_fk
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT;
    RAISE NOTICE '✅ Added FK inventory.warehouse_id → warehouses';
  END IF;
END $$;


-- ============================================================================
-- 10. REFRESH FUNCTION para inventory_balances
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_inventory_balances()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh concurrente (no bloquea lecturas)
  REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_balances;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Este trigger se ejecutará desde inventory-service después de cada batch
-- Opcional: se puede llamar manualmente o programar via pg_cron
-- NOTA: No crear trigger automático porque REFRESH CONCURRENTLY es blocking en transacciones


COMMIT;

-- ============================================================================
-- ROLLBACK STRATEGY
-- ============================================================================
-- 
-- 1. DROP vistas y tablas:
--    DROP MATERIALIZED VIEW IF EXISTS inventory_balances;
--    DROP TABLE IF EXISTS debit_note_items;
--    DROP TABLE IF EXISTS debit_notes;
--    DROP TABLE IF EXISTS payment_transactions;
--    DROP TABLE IF EXISTS transactional_outbox;
--    DROP TABLE IF EXISTS inventory_ledger;
--    DROP TABLE IF EXISTS currencies;
--    DROP TABLE IF EXISTS branches;
--
-- 2. DROP función:
--    DROP FUNCTION IF EXISTS refresh_inventory_balances();
--
-- 3. DROP índices (se eliminan con CASCADE)
-- ============================================================================
