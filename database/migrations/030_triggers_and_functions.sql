-- ============================================================================
-- MIGRATION 030: TRIGGERS & FUNCTIONS — Lógica en base de datos
-- ============================================================================
-- Fecha: 2026-07-24
-- Propósito: Funciones SQL y triggers para:
--   1. Auto-update de updated_at
--   2. Auto-cálculo de previous_balance/new_balance en inventory_ledger
--   3. Refresh de inventory_balances materialized view
--   4. Publicación de eventos via transactional outbox
--   5. Validación de integridad en inventario
--   6. Auto-assign de company_id
-- Riesgo: MEDIO (crea funciones y triggers)
-- ============================================================================

BEGIN;


-- ============================================================================
-- 1. TRIGGER: Auto-update updated_at en todas las tablas
-- ============================================================================

-- Función genérica
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas que tienen updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name = 'updated_at'
    AND table_name NOT LIKE 'inventory_%'  -- excluimos ledger y movements (append-only)
    AND table_name NOT LIKE '%audit%'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ============================================================================
-- 2. TRIGGER: Auto-calcular saldos en inventory_ledger
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_ledger_balances()
RETURNS TRIGGER AS $$
DECLARE
  last_balance NUMERIC;
BEGIN
  -- Obtener el último balance para este producto+warehouse
  SELECT COALESCE(new_balance, 0)
  INTO last_balance
  FROM inventory_ledger
  WHERE product_id = NEW.product_id
    AND warehouse_id = NEW.warehouse_id
    AND id != NEW.id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  -- Calcular previous_balance
  NEW.previous_balance := COALESCE(last_balance, 0);

  -- Calcular new_balance según tipo de movimiento
  CASE NEW.movement_type
    WHEN 'PURCHASE_RECEIPT', 'ADJUSTMENT_POSITIVE', 'RETURN', 
         'TRANSFER_IN', 'SALE_RETURN', 'OPENING' THEN
      NEW.new_balance := NEW.previous_balance + NEW.quantity;
    WHEN 'SALE', 'PURCHASE_RETURN', 'ADJUSTMENT_NEGATIVE', 
         'TRANSFER_OUT', 'LOSS', 'DAMAGED' THEN
      NEW.new_balance := NEW.previous_balance - NEW.quantity;
    WHEN 'INVENTORY_COUNT' THEN
      -- Para inventario físico, new_balance es la cantidad contada
      NEW.new_balance := NEW.quantity;
    WHEN 'RESERVATION' THEN
      -- Reserva no cambia saldo físico, solo registra
      NEW.new_balance := NEW.previous_balance;
  END CASE;

  -- Calcular total_cost si no está seteado
  IF NEW.total_cost IS NULL THEN
    NEW.total_cost := NEW.quantity * COALESCE(NEW.unit_cost, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a inventory_ledger
DROP TRIGGER IF EXISTS calculate_balances ON inventory_ledger;
CREATE TRIGGER calculate_balances
  BEFORE INSERT ON inventory_ledger
  FOR EACH ROW
  EXECUTE FUNCTION calculate_ledger_balances();


-- ============================================================================
-- 3. TRIGGER: Refrescar inventory_balances después de insert en ledger
-- ============================================================================

-- Función para refresh del materialized view (async-safe)
CREATE OR REPLACE FUNCTION refresh_inventory_balances()
RETURNS TRIGGER AS $$
BEGIN
  -- En Supabase, no podemos hacer CONCURRENTLY sin superuser
  -- Usamos REFRESH normal que es bloqueante pero seguro
  REFRESH MATERIALIZED VIEW inventory_balances;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS refresh_balances_trigger ON inventory_ledger;
CREATE TRIGGER refresh_balances_trigger
  AFTER INSERT ON inventory_ledger
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_inventory_balances();


-- ============================================================================
-- 4. FUNCTION: Publicar eventos via transactional outbox
-- ============================================================================

-- Función para publicar evento (llamada desde otros triggers o directamente)
CREATE OR REPLACE FUNCTION publish_outbox_event(
  p_aggregate_type TEXT,
  p_aggregate_id UUID,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO transactional_outbox (
    aggregate_type,
    aggregate_id,
    event_type,
    payload,
    created_at
  ) VALUES (
    p_aggregate_type,
    p_aggregate_id,
    p_event_type,
    p_payload,
    NOW()
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 5. TRIGGER: Publicar evento al crear venta
-- ============================================================================

CREATE OR REPLACE FUNCTION on_sale_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM publish_outbox_event(
    'Sale',
    NEW.id,
    'SaleCreated',
    jsonb_build_object(
      'sale_id', NEW.id,
      'client_id', NEW.client_id,
      'total', NEW.total,
      'status', NEW.status,
      'company_id', NEW.company_id,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_created ON sales;
CREATE TRIGGER trg_sale_created
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION on_sale_created();


-- ============================================================================
-- 6. TRIGGER: Publicar evento al cambiar estado de venta
-- ============================================================================

CREATE OR REPLACE FUNCTION on_sale_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM publish_outbox_event(
      'Sale',
      NEW.id,
      'SaleStatusChanged',
      jsonb_build_object(
        'sale_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'company_id', NEW.company_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_status_changed ON sales;
CREATE TRIGGER trg_sale_status_changed
  AFTER UPDATE OF status ON sales
  FOR EACH ROW
  EXECUTE FUNCTION on_sale_status_changed();


-- ============================================================================
-- 7. TRIGGER: Publicar evento al crear compra
-- ============================================================================

CREATE OR REPLACE FUNCTION on_purchase_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM publish_outbox_event(
    'Purchase',
    NEW.id,
    'PurchaseCreated',
    jsonb_build_object(
      'purchase_id', NEW.id,
      'supplier_id', NEW.supplier_id,
      'total', NEW.total,
      'status', NEW.status,
      'company_id', NEW.company_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_created ON purchases;
CREATE TRIGGER trg_purchase_created
  AFTER INSERT ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION on_purchase_created();


-- ============================================================================
-- 8. TRIGGER: Publicar evento al cambiar estado de compra
-- ============================================================================

CREATE OR REPLACE FUNCTION on_purchase_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM publish_outbox_event(
      'Purchase',
      NEW.id,
      'PurchaseStatusChanged',
      jsonb_build_object(
        'purchase_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'company_id', NEW.company_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_status_changed ON purchases;
CREATE TRIGGER trg_purchase_status_changed
  AFTER UPDATE OF status ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION on_purchase_status_changed();


-- ============================================================================
-- 9. TRIGGER: Auto-generar NCF al crear factura
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_generate_ncf()
RETURNS TRIGGER AS $$
DECLARE
  seq RECORD;
  new_ncf TEXT;
BEGIN
  -- Solo si no tiene NCF asignado
  IF NEW.ncf IS NULL OR NEW.ncf = '' THEN
    -- Obtener secuencia para el tipo de documento
    SELECT * INTO seq
    FROM ncf_sequences
    WHERE document_type = NEW.document_type
      AND (company_id = NEW.company_id OR company_id IS NULL)
      AND is_active = true
      AND current_number < max_number
    ORDER BY company_id NULLS LAST
    LIMIT 1
    FOR UPDATE;

    IF seq IS NOT NULL THEN
      -- Incrementar número
      UPDATE ncf_sequences 
      SET current_number = current_number + 1
      WHERE id = seq.id;

      -- Formatear NCF: prefijo + número con ceros
      new_ncf := seq.prefix || LPAD((seq.current_number + 1)::TEXT, 8, '0');
      NEW.ncf := new_ncf;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_ncf ON invoices;
CREATE TRIGGER trg_auto_ncf
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_ncf();


-- ============================================================================
-- 10. TRIGGER: Validar stock antes de venta
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_stock_before_sale()
RETURNS TRIGGER AS $$
DECLARE
  available_stock NUMERIC;
  reserved_stock NUMERIC;
BEGIN
  -- Obtener stock disponible (saldo físico - reservado)
  SELECT 
    COALESCE(ilb.quantity, 0),
    COALESCE((SELECT SUM(quantity) FROM inventory_reservations 
              WHERE product_id = NEW.product_id 
              AND status = 'active'), 0)
  INTO available_stock, reserved_stock
  FROM inventory_ledger ilb
  WHERE ilb.product_id = NEW.product_id
    AND ilb.warehouse_id = COALESCE(
      (SELECT warehouse_id FROM inventory WHERE product_id = NEW.product_id LIMIT 1),
      (SELECT id FROM warehouses WHERE is_active = true LIMIT 1)
    )
  ORDER BY ilb.created_at DESC
  LIMIT 1;

  -- Verificar stock suficiente
  IF (available_stock - reserved_stock) < NEW.quantity THEN
    RAISE EXCEPTION 'Stock insuficiente para producto %. Disponible: %, Reservado: %, Solicitado: %',
      NEW.product_id, available_stock, reserved_stock, NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_stock ON sale_items;
CREATE TRIGGER trg_validate_stock
  BEFORE INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_stock_before_sale();


-- ============================================================================
-- 11. FUNCTION: Crear movimientos de inventario por venta
-- ============================================================================

CREATE OR REPLACE FUNCTION create_inventory_movement_for_sale()
RETURNS TRIGGER AS $$
DECLARE
  wh_id UUID;
  item RECORD;
BEGIN
  -- Obtener warehouse del producto
  SELECT warehouse_id INTO wh_id
  FROM inventory
  WHERE product_id = NEW.product_id
  LIMIT 1;

  -- Si no hay warehouse, usar el primero activo
  IF wh_id IS NULL THEN
    SELECT id INTO wh_id FROM warehouses WHERE is_active = true LIMIT 1;
  END IF;

  -- Crear movimiento de salida en inventario
  INSERT INTO inventory_movements (
    product_id,
    warehouse_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    created_by
  ) VALUES (
    NEW.product_id,
    wh_id,
    'SALE',
    NEW.quantity,
    'sale_item',
    NEW.id,
    FORMAT('Venta #%s', NEW.sale_id),
    NEW.created_by
  );

  -- Crear entrada en ledger
  INSERT INTO inventory_ledger (
    product_id,
    warehouse_id,
    movement_type,
    quantity,
    unit_cost,
    reference_type,
    reference_id,
    notes,
    created_by,
    company_id
  ) VALUES (
    NEW.product_id,
    wh_id,
    'SALE',
    NEW.quantity,
    COALESCE(NEW.unit_price, 0),  -- usar precio como costo para simplificar
    'sale_item',
    NEW.id,
    FORMAT('Salida por venta #%s', NEW.sale_id),
    NEW.created_by,
    (SELECT company_id FROM sales WHERE id = NEW.sale_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Este trigger se aplica después de que la venta es confirmada
-- No se aplica en INSERT directo sino cuando sale_items se confirma
-- DROP TRIGGER IF EXISTS trg_movement_for_sale ON sale_items;
-- CREATE TRIGGER trg_movement_for_sale
--   AFTER INSERT ON sale_items
--   FOR EACH ROW
--   EXECUTE FUNCTION create_inventory_movement_for_sale();


-- ============================================================================
-- 12. FUNCTION: Auto-assign company_id
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_assign_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := (
      SELECT id FROM companies 
      WHERE is_active = true 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas que necesitan company_id
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY[
      'products', 'categories', 'brands', 'inventory', 'inventory_movements',
      'inventory_ledger', 'purchases', 'purchase_items', 'sales', 'sale_items',
      'invoices', 'clients', 'suppliers', 'warehouses'
    ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = tbl 
      AND column_name = 'company_id'
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS set_company_id ON %I; CREATE TRIGGER set_company_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id();',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;


-- ============================================================================
-- 13. FUNCTION: Calcular total de venta automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_sale_total()
RETURNS TRIGGER AS $$
DECLARE
  new_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(subtotal), 0)
  INTO new_total
  FROM sale_items
  WHERE sale_id = NEW.sale_id;

  UPDATE sales 
  SET total = new_total
  WHERE id = NEW.sale_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_sale_total ON sale_items;
CREATE TRIGGER trg_calculate_sale_total
  AFTER INSERT OR UPDATE OR DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sale_total();


-- ============================================================================
-- 14. FUNCTION: Calcular total de compra automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_purchase_total()
RETURNS TRIGGER AS $$
DECLARE
  new_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(subtotal), 0)
  INTO new_total
  FROM purchase_items
  WHERE purchase_id = NEW.purchase_id;

  UPDATE purchases 
  SET total = new_total
  WHERE id = NEW.purchase_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_purchase_total ON purchase_items;
CREATE TRIGGER trg_calculate_purchase_total
  AFTER INSERT OR UPDATE OR DELETE ON purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_purchase_total();


-- ============================================================================
-- 15. FUNCTION: Validar que solo una sesión de caja está abierta
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_single_open_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' THEN
    IF EXISTS (
      SELECT 1 FROM cash_register_sessions
      WHERE cash_register_id = NEW.cash_register_id
        AND status = 'open'
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Ya existe una sesión abierta para esta caja. Cierra la sesión actual primero.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_single_session ON cash_register_sessions;
CREATE TRIGGER trg_validate_single_session
  BEFORE INSERT OR UPDATE ON cash_register_sessions
  FOR EACH ROW
  EXECUTE FUNCTION validate_single_open_session();


-- ============================================================================
-- 16. FUNCTION: Validar NCF duplicado
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_ncf_unique()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ncf IS NOT NULL AND NEW.ncf != '' THEN
    IF EXISTS (
      SELECT 1 FROM invoices 
      WHERE ncf = NEW.ncf 
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'El NCF % ya existe. No se pueden duplicar NCFs.', NEW.ncf;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_ncf ON invoices;
CREATE TRIGGER trg_validate_ncf
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_ncf_unique();


-- ============================================================================
-- 17. FUNCTION: Prevenir eliminación de registros en tablas críticas
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DELETE no permitido en %. Use soft delete (SET deleted_at) en su lugar.', TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas que no deben eliminarse físicamente
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY[
      'sales', 'sale_items', 'invoices', 'purchases', 'purchase_items',
      'inventory_ledger', 'audit_logs', 'cash_register_sessions',
      'payment_transactions', 'accounting_entries'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS prevent_delete ON %I; CREATE TRIGGER prevent_delete BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ============================================================================
-- 18. FUNCTION: Validar que el status de venta sea consistente
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_sale_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Transiciones válidas de estado de venta
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE OLD.status
      WHEN 'pending' THEN
        IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
          RAISE EXCEPTION 'Transición inválida: pending → %', NEW.status;
        END IF;
      WHEN 'confirmed' THEN
        IF NEW.status NOT IN ('processing', 'cancelled') THEN
          RAISE EXCEPTION 'Transición inválida: confirmed → %', NEW.status;
        END IF;
      WHEN 'processing' THEN
        IF NEW.status NOT IN ('shipped', 'completed', 'cancelled') THEN
          RAISE EXCEPTION 'Transición inválida: processing → %', NEW.status;
        END IF;
      WHEN 'shipped' THEN
        IF NEW.status NOT IN ('delivered', 'cancelled') THEN
          RAISE EXCEPTION 'Transición inválida: shipped → %', NEW.status;
        END IF;
      WHEN 'completed' THEN
        RAISE EXCEPTION 'No se puede cambiar el estado de una venta completada';
      WHEN 'cancelled' THEN
        RAISE EXCEPTION 'No se puede cambiar el estado de una venta cancelada';
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_sale_status ON sales;
CREATE TRIGGER trg_validate_sale_status
  BEFORE UPDATE OF status ON sales
  FOR EACH ROW
  EXECUTE FUNCTION validate_sale_status_transition();


-- ============================================================================
-- 19. FUNCTION: Prevenir stock negativo
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.new_balance < 0 THEN
    RAISE EXCEPTION 'Stock negativo no permitido para producto %. Balance actual: %, Movimiento: %',
      NEW.product_id, NEW.previous_balance, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_negative_stock ON inventory_ledger;
CREATE TRIGGER trg_prevent_negative_stock
  BEFORE INSERT ON inventory_ledger
  FOR EACH ROW
  WHEN (NEW.movement_type NOT IN ('OPENING', 'INVENTORY_COUNT', 'RESERVATION'))
  EXECUTE FUNCTION prevent_negative_stock();


-- ============================================================================
-- 20. FUNCTION: Crear cliente automático para compras online
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_client_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando un usuario se registra, crear cliente automáticamente
  IF NOT EXISTS (
    SELECT 1 FROM clients WHERE user_id = NEW.id
  ) THEN
    INSERT INTO clients (
      user_id,
      first_name,
      last_name,
      email,
      phone,
      client_type,
      is_active
    ) VALUES (
      NEW.id,
      COALESCE(NEW.first_name, 'Cliente'),
      COALESCE(NEW.last_name, ''),
      NEW.email,
      COALESCE(NEW.phone, ''),
      'regular',
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_client ON users;
CREATE TRIGGER trg_auto_client
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_for_user();


-- ============================================================================
-- 21. FUNCTION: Auditoría automática (cambios en tablas sensibles)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_sensitive_changes()
RETURNS TRIGGER AS $$
DECLARE
  action TEXT;
  old_data JSONB;
  new_data JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    action := 'DELETE';
    old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    action := 'UPDATE';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    action := 'INSERT';
    new_data := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    performed_by,
    ip_address,
    user_agent
  ) VALUES (
    action,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN (OLD.id)::TEXT
      ELSE (NEW.id)::TEXT
    END,
    old_data,
    new_data,
    auth.user_id(),
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar auditoría a tablas sensibles
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY[
      'users', 'sales', 'invoices', 'purchases', 'inventory',
      'inventory_ledger', 'cash_register_sessions', 'payments'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_log ON %I; CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION log_sensitive_changes();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ============================================================================
-- RESUMEN
-- ============================================================================
-- 21 funciones creadas/actualizadas:
--   1. update_updated_at_column() — genérico
--   2. calculate_ledger_balances() — auto-cálculo saldos
--   3. refresh_inventory_balances() — refresh materialized view
--   4. publish_outbox_event() — publicar eventos
--   5. on_sale_created() — evento post-venta
--   6. on_sale_status_changed() — evento cambio estado venta
--   7. on_purchase_created() — evento post-compra
--   8. on_purchase_status_changed() — evento cambio estado compra
--   9. auto_generate_ncf() — NCF automático
--  10. validate_stock_before_sale() — validación stock
--  11. create_inventory_movement_for_sale() — movimiento inventario
--  12. auto_assign_company_id() — auto-asignar empresa
--  13. calculate_sale_total() — recalcular total venta
--  14. calculate_purchase_total() — recalcular total compra
--  15. validate_single_open_session() — sesión única caja
--  16. validate_ncf_unique() — NCF no duplicado
--  17. prevent_hard_delete() — soft delete forzado
--  18. validate_sale_status_transition() — transiciones válidas
--  19. prevent_negative_stock() — stock no negativo
--  20. auto_create_client_for_user() — cliente automático
--  21. log_sensitive_changes() — auditoría automática
--
-- Triggers: ~40+ triggers aplicados a tablas del dominio
-- ============================================================================


COMMIT;

-- ============================================================================
-- ROLLBACK:
-- Para cada trigger: DROP TRIGGER IF EXISTS <name> ON <table>;
-- Para cada función: DROP FUNCTION IF EXISTS <function_name>();
-- ============================================================================
