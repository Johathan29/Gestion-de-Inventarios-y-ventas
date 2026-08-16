-- ============================================================
-- MIGRACIÓN 064: CONCURRENCIA DE INVENTARIO
-- ============================================================
-- Problema: operaciones read-check-write (TOCTOU) permiten:
--   - Stock negativo con ventas simultáneas (decrease_stock_from_sale
--     leía stock, validaba y luego actualizaba sin lock de fila).
--   - Kardex con previous_stock/new_stock inconsistentes bajo concurrencia
--     (se leían en un SELECT separado del UPDATE).
--   - Entradas/salidas manuales del inventory-service (findOne + upsert).
--
-- Solución:
--   1. RPCs atómicos fn_stock_entry / fn_stock_exit / fn_stock_adjust
--      (el UPDATE condicional serializa por fila; imposible stock negativo).
--   2. decrease_stock_from_sale → UPDATE ... WHERE stock >= qty RETURNING.
--   3. update_product_cost_from_purchase / revert_stock_on_sale_cancel
--      → previous/new stock calculados con RETURNING (misma sentencia).
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. RPC: ENTRADA ATÓMICA
--    INSERT ... ON CONFLICT DO UPDATE es una sola sentencia
--    atómica (lock de fila implícito) → sin lecturas intermedias.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_stock_entry(
  p_product_id uuid,
  p_quantity integer,
  p_warehouse varchar DEFAULT 'principal',
  p_unit_cost numeric DEFAULT 0,
  p_reason text DEFAULT NULL,
  p_reference_type varchar DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_variant_id uuid DEFAULT NULL,
  p_company_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_new_stock integer;
  v_prev_stock integer;
BEGIN
  -- company fallback
  IF p_company_id IS NULL THEN
    SELECT company_id INTO p_company_id FROM products WHERE id = p_product_id LIMIT 1;
    IF p_company_id IS NULL THEN
      p_company_id := :'target_company'::uuid;
    END IF;
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  INSERT INTO inventory (
    product_id, warehouse, stock, company_id,
    total_price, avg_cost, last_cost, movement_date, updated_at
  )
  VALUES (
    p_product_id, p_warehouse, p_quantity, p_company_id,
    p_quantity * p_unit_cost,
    CASE WHEN p_unit_cost > 0 THEN p_unit_cost ELSE 0 END,
    CASE WHEN p_unit_cost > 0 THEN p_unit_cost ELSE 0 END,
    NOW(), NOW()
  )
  ON CONFLICT (product_id, warehouse)
  DO UPDATE SET
    stock = inventory.stock + p_quantity,
    total_price = COALESCE(inventory.total_price, 0) + (p_quantity * p_unit_cost),
    avg_cost = CASE WHEN (inventory.stock + p_quantity) > 0
                    THEN (COALESCE(inventory.total_price, 0) + (p_quantity * p_unit_cost))
                         / (inventory.stock + p_quantity)
                    ELSE 0 END,
    last_cost = CASE WHEN p_unit_cost > 0 THEN p_unit_cost ELSE inventory.last_cost END,
    movement_date = NOW(),
    updated_at = NOW()
  RETURNING stock INTO v_new_stock;

  v_prev_stock := v_new_stock - p_quantity;

  RETURN jsonb_build_object(
    'previous_stock', v_prev_stock,
    'new_stock', v_new_stock
  );
END;
$;

-- ════════════════════════════════════════════════════════════
-- 2. RPC: SALIDA ATÓMICA (imposible stock negativo)
--    UPDATE condicional: WHERE stock >= qty. Bajo concurrencia,
--    la fila queda lockeada y la condición se re-evalúa tras el
--    commit del primero → el segundo obtiene NOT FOUND.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_stock_exit(
  p_product_id uuid,
  p_quantity integer,
  p_warehouse varchar DEFAULT 'principal',
  p_reason text DEFAULT NULL,
  p_reference_type varchar DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_variant_id uuid DEFAULT NULL,
  p_company_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stock integer;
  v_prev_stock integer;
  v_available integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  UPDATE inventory
  SET stock = stock - p_quantity,
      movement_date = NOW(),
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND warehouse = p_warehouse
    AND stock >= p_quantity
  RETURNING stock INTO v_new_stock;

  IF NOT FOUND THEN
    SELECT stock INTO v_available
    FROM inventory
    WHERE product_id = p_product_id AND warehouse = p_warehouse;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;

    RAISE EXCEPTION 'INSUFFICIENT_STOCK';
  END IF;

  v_prev_stock := v_new_stock + p_quantity;

  RETURN jsonb_build_object(
    'previous_stock', v_prev_stock,
    'new_stock', v_new_stock
  );
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 3. RPC: AJUSTE ATÓMICO (fija stock absoluto)
--    SELECT ... FOR UPDATE lockea la fila antes de leer el valor
--    previo → previous_stock correcto bajo concurrencia.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_stock_adjust(
  p_product_id uuid,
  p_new_quantity integer,
  p_warehouse varchar DEFAULT 'principal',
  p_reason text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_company_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_stock integer;
  v_new_stock integer;
BEGIN
  IF p_new_quantity IS NULL OR p_new_quantity < 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  SELECT stock INTO v_prev_stock
  FROM inventory
  WHERE product_id = p_product_id AND warehouse = p_warehouse
  FOR UPDATE;

  IF NOT FOUND THEN
    v_prev_stock := 0;
    INSERT INTO inventory (product_id, warehouse, stock, company_id, movement_date, updated_at)
    VALUES (p_product_id, p_warehouse, p_new_quantity, p_company_id, NOW(), NOW())
    RETURNING stock INTO v_new_stock;
  ELSE
    UPDATE inventory
    SET stock = p_new_quantity,
        movement_date = NOW(),
        updated_at = NOW()
    WHERE product_id = p_product_id AND warehouse = p_warehouse
    RETURNING stock INTO v_new_stock;
  END IF;

  RETURN jsonb_build_object(
    'previous_stock', v_prev_stock,
    'new_stock', v_new_stock
  );
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 4. decrease_stock_from_sale → ATOMIZADO
--    Antes: SELECT (sin lock) → validar → UPDATE. Dos ventas
--    concurrentes podían validar ambas y dejar stock negativo.
--    Ahora: UPDATE condicional con RETURNING (serializa por fila).
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION decrease_stock_from_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_prev_stock INTEGER;
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    -- Variante: descuento condicional atómico
    UPDATE product_variants
    SET stock = stock - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.variant_id
      AND stock >= NEW.quantity
    RETURNING stock INTO v_current_stock;

    IF NOT FOUND THEN
      SELECT stock INTO v_current_stock
      FROM product_variants
      WHERE id = NEW.variant_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variante % no encontrada', NEW.variant_id;
      END IF;

      RAISE EXCEPTION 'Stock insuficiente para variante %: disponible %, requerido %',
        NEW.variant_name, v_current_stock, NEW.quantity;
    END IF;

    v_prev_stock := v_current_stock + NEW.quantity;

    UPDATE inventory
    SET stock = GREATEST(0, stock - NEW.quantity),
        updated_at = NOW()
    WHERE product_id = NEW.product_id AND warehouse = 'principal';

    INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, variant_id, company_id)
    SELECT
      NEW.product_id,
      'principal',
      'exit_sale',
      NEW.quantity,
      v_prev_stock,
      v_current_stock,
      'sale',
      NEW.sale_id,
      'Venta realizada - variante: ' || COALESCE(NEW.variant_name, ''),
      s.user_id,
      NEW.variant_id,
      s.company_id
    FROM sales s
    WHERE s.id = NEW.sale_id;
  ELSE
    -- Producto simple: UPDATE condicional atómico
    UPDATE inventory
    SET stock = stock - NEW.quantity,
        movement_date = NOW(),
        total_price = GREATEST(0, total_price - (NEW.quantity * NEW.unit_price)),
        updated_at = NOW()
    WHERE product_id = NEW.product_id
      AND warehouse = 'principal'
      AND stock >= NEW.quantity
    RETURNING stock INTO v_new_stock;

    IF NOT FOUND THEN
      SELECT stock INTO v_current_stock
      FROM inventory
      WHERE product_id = NEW.product_id AND warehouse = 'principal';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto % sin inventario', NEW.product_id;
      END IF;

      RAISE EXCEPTION 'Stock insuficiente para %: disponible %, requerido %',
        NEW.product_name, v_current_stock, NEW.quantity;
    END IF;

    v_prev_stock := v_new_stock + NEW.quantity;

    INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, company_id)
    SELECT
      NEW.product_id,
      'principal',
      'exit_sale',
      NEW.quantity,
      v_prev_stock,
      v_new_stock,
      'sale',
      NEW.sale_id,
      'Venta realizada',
      s.user_id,
      s.company_id
    FROM sales s
    WHERE s.id = NEW.sale_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════
-- 5. update_product_cost_from_purchase → kardex con RETURNING
--    El upsert ya era atómico; el previous_stock del kardex se
--    leía en un SELECT separado (inconsistente bajo concurrencia).
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_product_cost_from_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_id UUID;
  v_purchase_date TIMESTAMPTZ;
  v_company_id UUID;
  v_new_stock INTEGER;
  v_prev_stock INTEGER;
BEGIN
  SELECT supplier_id, created_at, company_id INTO v_supplier_id, v_purchase_date, v_company_id
  FROM purchases WHERE id = NEW.purchase_id;

  UPDATE products
  SET cost_price = NEW.unit_price,
      updated_at = NOW()
  WHERE id = NEW.product_id;

  INSERT INTO inventory (product_id, warehouse, stock, supplier_id, entry_date, movement_date, total_price, company_id)
  VALUES (
    NEW.product_id,
    'principal',
    NEW.quantity,
    v_supplier_id,
    v_purchase_date,
    NOW(),
    NEW.quantity * NEW.unit_price,
    v_company_id
  )
  ON CONFLICT (product_id, warehouse)
  DO UPDATE SET
    stock = inventory.stock + NEW.quantity,
    supplier_id = COALESCE(v_supplier_id, inventory.supplier_id),
    total_price = inventory.total_price + (NEW.quantity * NEW.unit_price),
    movement_date = NOW(),
    updated_at = NOW()
  RETURNING stock INTO v_new_stock;

  v_prev_stock := v_new_stock - NEW.quantity;

  INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, company_id)
  SELECT
    NEW.product_id,
    'principal',
    'entry',
    NEW.quantity,
    v_prev_stock,
    v_new_stock,
    'purchase',
    NEW.purchase_id,
    'Entrada por compra automática',
    p.user_id,
    v_company_id
  FROM purchases p
  WHERE p.id = NEW.purchase_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════
-- 6. revert_stock_on_sale_cancel → kardex con RETURNING
--    El incremento ya era atómico; previous/new se leían aparte.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION revert_stock_on_sale_cancel()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_prev_stock INTEGER;
  rec RECORD;
BEGIN
  IF OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    FOR rec IN
      SELECT si.product_id, si.quantity, si.unit_price, si.product_name,
             si.variant_id, si.variant_name
      FROM sale_items si
      WHERE si.sale_id = NEW.id
    LOOP
      IF rec.variant_id IS NOT NULL THEN
        UPDATE product_variants
        SET stock = stock + rec.quantity,
            updated_at = NOW()
        WHERE id = rec.variant_id
        RETURNING stock INTO v_new_stock;

        v_prev_stock := v_new_stock - rec.quantity;

        UPDATE inventory
        SET stock = stock + rec.quantity,
            updated_at = NOW()
        WHERE product_id = rec.product_id AND warehouse = 'principal';

        INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, variant_id, company_id)
        VALUES (
          rec.product_id,
          'principal',
          'entry',
          rec.quantity,
          v_prev_stock,
          v_new_stock,
          'sale_cancel',
          NEW.id,
          'Venta anulada - reversión de inventario (variante: ' || COALESCE(rec.variant_name, '') || ')',
          NEW.user_id,
          rec.variant_id,
          NEW.company_id
        );
      ELSE
        UPDATE inventory
        SET stock = stock + rec.quantity,
            movement_date = NOW(),
            total_price = GREATEST(0, total_price + (rec.quantity * rec.unit_price)),
            updated_at = NOW()
        WHERE product_id = rec.product_id AND warehouse = 'principal'
        RETURNING stock INTO v_new_stock;

        v_prev_stock := v_new_stock - rec.quantity;

        INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, company_id)
        VALUES (
          rec.product_id,
          'principal',
          'entry',
          rec.quantity,
          v_prev_stock,
          v_new_stock,
          'sale_cancel',
          NEW.id,
          'Venta anulada - reversión de inventario',
          NEW.user_id,
          NEW.company_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════
-- 7. Permisos para PostgREST (RPC invocable desde servicios)
-- ════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.fn_stock_entry(uuid, integer, varchar, numeric, text, varchar, uuid, uuid, uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_stock_exit(uuid, integer, varchar, text, varchar, uuid, uuid, uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_stock_adjust(uuid, integer, varchar, text, uuid, uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_stock_entry IS 'Entrada atómica de stock (INSERT ON CONFLICT DO UPDATE + RETURNING) — sin TOCTOU';
COMMENT ON FUNCTION public.fn_stock_exit IS 'Salida atómica de stock (UPDATE condicional stock >= qty) — imposible stock negativo';
COMMENT ON FUNCTION public.fn_stock_adjust IS 'Ajuste atómico de stock absoluto (SELECT FOR UPDATE + UPDATE)';
