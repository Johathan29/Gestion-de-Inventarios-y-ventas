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

  INSERT INTO inventory (
    product_id, warehouse, stock, company_id,
    total_price, avg_cost, last_cost, movement_date, updated_at
  )
  VALUES (
    p_product_id, p_warehouse, p_quantity, v_company_id,
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

  INSERT INTO inventory_movements (
    product_id, warehouse, type, quantity,
    previous_stock, new_stock,
    unit_cost, total_cost,
    reference_type, reference_id, reason, user_id, variant_id, company_id
  )
  VALUES (
    p_product_id, p_warehouse, COALESCE(p_movement_type, 'entry'), p_quantity,
    v_prev_stock, v_new_stock,
    p_unit_cost, p_quantity * p_unit_cost,
    p_reference_type, p_reference_id, p_reason, p_user_id, p_variant_id, v_company_id
  )
  RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object(
    'previous_stock', v_prev_stock,
    'new_stock', v_new_stock,
    'movement_id', v_movement_id,
    'type', COALESCE(p_movement_type, 'entry')
  );
END;
$$;