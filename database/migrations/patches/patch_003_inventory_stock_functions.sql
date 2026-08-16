-- PATCH 003: Harden inventory stock functions to accept optional p_company_id
-- Adds COALESCE(p_company_id, NEW.company_id, product.company_id, :'target_company')
-- Set target_company before running:
-- \set target_company '00000000-0000-0000-0000-000000000001'

-- 3.1 fn_stock_entry example template
-- Replace fn_stock_entry to match existing signature and add company_id fallback
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
AS $$
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
$$;

-- 3.2 decrease_stock_from_sale (trigger style) template
-- Replace decrease_stock_from_sale with atomic implementation and company fallback
CREATE OR REPLACE FUNCTION public.decrease_stock_from_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_prev_stock INTEGER;
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
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
      COALESCE(s.company_id, :'target_company'::uuid)
    FROM sales s
    WHERE s.id = NEW.sale_id;
  ELSE
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
      COALESCE(s.company_id, :'target_company'::uuid)
    FROM sales s
    WHERE s.id = NEW.sale_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOTE: Adapt column names and logic to match your real functions.
