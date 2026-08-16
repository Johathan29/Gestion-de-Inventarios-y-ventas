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