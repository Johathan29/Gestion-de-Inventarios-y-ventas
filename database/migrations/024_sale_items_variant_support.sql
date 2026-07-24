-- ===================================================
-- MIGRATION 024: Add variant_id to sale_items + inventory movements
-- ===================================================
-- Adds variant tracking to sale_items so each sale item can
-- reference a specific product variant. Also updates the
-- inventory triggers to handle variant stock correctly.
-- ===================================================

-- 1. Add variant columns to sale_items
ALTER TABLE sale_items
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_sale_items_variant_id ON sale_items(variant_id);

-- 2. Add variant_id to inventory_movements (nullable, for variant-aware tracking)
ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_id ON inventory_movements(variant_id);

-- ===================================================
-- 3. Replace decrease_stock_from_sale() trigger to handle variants
-- ===================================================
CREATE OR REPLACE FUNCTION decrease_stock_from_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  -- If the sale item has a variant, update variant stock instead of inventory
  IF NEW.variant_id IS NOT NULL THEN
    -- Get current variant stock
    SELECT stock INTO v_current_stock
    FROM product_variants
    WHERE id = NEW.variant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variante % no encontrada', NEW.variant_id;
    END IF;

    IF v_current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para variante %: disponible %, requerido %',
        NEW.variant_name, v_current_stock, NEW.quantity;
    END IF;

    -- Decrease variant stock
    UPDATE product_variants
    SET stock = stock - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.variant_id;

    -- Record movement with variant_id
    INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, variant_id)
    SELECT
      NEW.product_id,
      'principal',
      'exit_sale',
      NEW.quantity,
      v_current_stock,
      v_current_stock - NEW.quantity,
      'sale',
      NEW.sale_id,
      'Venta realizada - variante: ' || COALESCE(NEW.variant_name, ''),
      s.user_id,
      NEW.variant_id
    FROM sales s
    WHERE s.id = NEW.sale_id;
  ELSE
    -- Original logic: update inventory table
    SELECT stock INTO v_current_stock
    FROM inventory
    WHERE product_id = NEW.product_id AND warehouse = 'principal';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % sin inventario', NEW.product_id;
    END IF;

    IF v_current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para %: disponible %, requerido %',
        NEW.product_name, v_current_stock, NEW.quantity;
    END IF;

    -- Disminuir stock
    UPDATE inventory
    SET stock = stock - NEW.quantity,
        movement_date = NOW(),
        total_price = GREATEST(0, total_price - (NEW.quantity * NEW.unit_price)),
        updated_at = NOW()
    WHERE product_id = NEW.product_id AND warehouse = 'principal';

    -- Registrar movimiento de salida
    INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id)
    SELECT
      NEW.product_id,
      'principal',
      'exit_sale',
      NEW.quantity,
      v_current_stock,
      v_current_stock - NEW.quantity,
      'sale',
      NEW.sale_id,
      'Venta realizada',
      s.user_id
    FROM sales s
    WHERE s.id = NEW.sale_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================
-- 4. Replace revert_stock_on_sale_cancel() to handle variants
-- ===================================================
CREATE OR REPLACE FUNCTION revert_stock_on_sale_cancel()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
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
        -- Restore variant stock
        SELECT stock INTO v_current_stock
        FROM product_variants
        WHERE id = rec.variant_id;

        UPDATE product_variants
        SET stock = stock + rec.quantity,
            updated_at = NOW()
        WHERE id = rec.variant_id;

        -- Record entry movement with variant_id
        INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, variant_id)
        VALUES (
          rec.product_id,
          'principal',
          'entry',
          rec.quantity,
          v_current_stock,
          v_current_stock + rec.quantity,
          'sale_cancel',
          NEW.id,
          'Venta anulada - reversión de inventario (variante: ' || COALESCE(rec.variant_name, '') || ')',
          NEW.user_id,
          rec.variant_id
        );
      ELSE
        -- Original logic: restore inventory stock
        SELECT stock INTO v_current_stock
        FROM inventory
        WHERE product_id = rec.product_id AND warehouse = 'principal';

        UPDATE inventory
        SET stock = stock + rec.quantity,
            movement_date = NOW(),
            total_price = GREATEST(0, total_price + (rec.quantity * rec.unit_price)),
            updated_at = NOW()
        WHERE product_id = rec.product_id AND warehouse = 'principal';

        -- Registrar movimiento de entrada (reversión)
        INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id)
        VALUES (
          rec.product_id,
          'principal',
          'entry',
          rec.quantity,
          v_current_stock,
          v_current_stock + rec.quantity,
          'sale_cancel',
          NEW.id,
          'Venta anulada - reversión de inventario',
          NEW.user_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
