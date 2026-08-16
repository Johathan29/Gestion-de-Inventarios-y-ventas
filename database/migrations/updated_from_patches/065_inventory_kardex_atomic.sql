-- ============================================================
-- MIGRACIÓN 065: KARDEX ATÓMICO EN LOS RPCs DE INVENTARIO
-- ============================================================
-- Problema detectado tras aplicar 064:
--   El inventory-service ejecutaba el RPC (cambio de stock) y LUEGO
--   insertaba el movimiento de kardex en una transacción separada.
--   Bajo concurrencia:
--     - Las filas del kardex se intercalan (orden no contiguo:
--       un exit prev=50,new=45 puede aparecer DESPUÉS de uno
--       prev=45,new=40).
--     - Existe una ventana donde el stock ya cambió pero el kardex
--       aún no tiene la fila (brecha de auditoría).
--
-- Solución: fn_stock_entry / fn_stock_exit / fn_stock_adjust ahora
-- insertan el movimiento de kardex EN LA MISMA transacción, con
-- previous_stock/new_stock del RETURNING (mismo patrón que los
-- triggers de ventas/compra). El servicio deja de insertar el
-- movimiento (evita doble inserción) y solo publica eventos.
--
-- Los RPCs retornan { previous_stock, new_stock, movement_id, type }.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. ENTRADA ATÓMICA + KARDEX
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
-- 2. SALIDA ATÓMICA + KARDEX
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
  p_company_id uuid DEFAULT NULL,
  p_movement_type varchar DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stock integer;
  v_prev_stock integer;
  v_available integer;
  v_movement_id uuid;
  v_company_id uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  v_company_id := COALESCE(
    p_company_id,
    (SELECT company_id FROM products WHERE id = p_product_id)
  );

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

  INSERT INTO inventory_movements (
    product_id, warehouse, type, quantity,
    previous_stock, new_stock,
    reference_type, reference_id, reason, user_id, variant_id, company_id
  )
  VALUES (
    p_product_id, p_warehouse, COALESCE(p_movement_type, 'exit'), p_quantity,
    v_prev_stock, v_new_stock,
    p_reference_type, p_reference_id, p_reason, p_user_id, p_variant_id, v_company_id
  )
  RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object(
    'previous_stock', v_prev_stock,
    'new_stock', v_new_stock,
    'movement_id', v_movement_id,
    'type', COALESCE(p_movement_type, 'exit')
  );
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 3. AJUSTE ATÓMICO + KARDEX
--    type: adjustment_plus / adjustment_minus; se omite el
--    movimiento si no hubo cambio (new == prev).
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
  v_diff integer;
  v_movement_id uuid;
  v_company_id uuid;
BEGIN
  IF p_new_quantity IS NULL OR p_new_quantity < 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  v_company_id := COALESCE(
    p_company_id,
    (SELECT company_id FROM products WHERE id = p_product_id)
  );

  SELECT stock INTO v_prev_stock
  FROM inventory
  WHERE product_id = p_product_id AND warehouse = p_warehouse
  FOR UPDATE;

  IF NOT FOUND THEN
    v_prev_stock := 0;
    INSERT INTO inventory (product_id, warehouse, stock, company_id, movement_date, updated_at)
    VALUES (p_product_id, p_warehouse, p_new_quantity, v_company_id, NOW(), NOW())
    RETURNING stock INTO v_new_stock;
  ELSE
    UPDATE inventory
    SET stock = p_new_quantity,
        movement_date = NOW(),
        updated_at = NOW()
    WHERE product_id = p_product_id AND warehouse = p_warehouse
    RETURNING stock INTO v_new_stock;
  END IF;

  v_diff := v_new_stock - v_prev_stock;

  IF v_diff <> 0 THEN
    INSERT INTO inventory_movements (
      product_id, warehouse, type, quantity,
      previous_stock, new_stock,
      reason, user_id, company_id
    )
    VALUES (
      p_product_id, p_warehouse,
      CASE WHEN v_diff > 0 THEN 'adjustment_plus' ELSE 'adjustment_minus' END,
      ABS(v_diff),
      v_prev_stock, v_new_stock,
      p_reason, p_user_id, v_company_id
    )
    RETURNING id INTO v_movement_id;
  END IF;

  RETURN jsonb_build_object(
    'previous_stock', v_prev_stock,
    'new_stock', v_new_stock,
    'movement_id', v_movement_id,
    'type', CASE WHEN v_diff > 0 THEN 'adjustment_plus'
                 WHEN v_diff < 0 THEN 'adjustment_minus'
                 ELSE 'no_change' END
  );
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 4. GRANTS (se conservan con CREATE OR REPLACE, se reafirman)
-- ════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.fn_stock_entry(uuid, integer, varchar, numeric, text, varchar, uuid, uuid, uuid, uuid, varchar) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_stock_exit(uuid, integer, varchar, text, varchar, uuid, uuid, uuid, uuid, varchar) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_stock_adjust(uuid, integer, varchar, text, uuid, uuid) TO anon, authenticated, service_role;
