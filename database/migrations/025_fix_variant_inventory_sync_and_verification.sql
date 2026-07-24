-- ============================================================
-- Migration 025: Fix variant inventory sync & add status/verification
-- ============================================================
-- Problemas resueltos:
-- 1. Cuando se vende una variante, el stock de la tabla inventory
--    no se actualizaba (solo se actualizaba product_variants.stock)
-- 2. No existía un sistema de verificación para compras
--    (los productos llegaban directo a disponible para venta)
-- ============================================================

-- ===================================================
-- PARTE 1: Sincronizar inventory.stock con variantes
-- ===================================================

-- 1.1. Sincronizar inventory.stock = SUM(product_variants.stock)
--      para productos que tienen variantes
UPDATE inventory i
SET stock = s.total_stock,
    updated_at = NOW()
FROM (
  SELECT pv.product_id, COALESCE(SUM(pv.stock), 0) AS total_stock
  FROM product_variants pv
  GROUP BY pv.product_id
) s
WHERE i.product_id = s.product_id;

-- 1.2. Para productos con variantes pero SIN registro en inventory,
--      crear uno con el total de las variantes
INSERT INTO inventory (product_id, warehouse, stock, min_stock)
SELECT
  s.product_id,
  'principal',
  s.total_stock,
  5
FROM (
  SELECT pv.product_id, COALESCE(SUM(pv.stock), 0) AS total_stock
  FROM product_variants pv
  GROUP BY pv.product_id
) s
WHERE NOT EXISTS (
  SELECT 1 FROM inventory i WHERE i.product_id = s.product_id
);

-- ===================================================
-- PARTE 2: Actualizar decrease_stock_from_sale()
--          para que también descuente inventory.stock
-- ===================================================
CREATE OR REPLACE FUNCTION decrease_stock_from_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
  v_inv_current_stock INTEGER;
BEGIN
  -- If the sale item has a variant, update variant stock AND inventory stock
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

    -- ALSO decrease main inventory stock to keep it in sync
    SELECT stock INTO v_inv_current_stock
    FROM inventory
    WHERE product_id = NEW.product_id AND warehouse = 'principal';

    IF FOUND THEN
      UPDATE inventory
      SET stock = GREATEST(0, stock - NEW.quantity),
          updated_at = NOW()
      WHERE product_id = NEW.product_id AND warehouse = 'principal';
    END IF;

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
-- PARTE 3: Actualizar revert_stock_on_sale_cancel()
--          para que también restaure inventory.stock
-- ===================================================
CREATE OR REPLACE FUNCTION revert_stock_on_sale_cancel()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
  v_inv_current_stock INTEGER;
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

        -- ALSO restore main inventory stock
        SELECT stock INTO v_inv_current_stock
        FROM inventory
        WHERE product_id = rec.product_id AND warehouse = 'principal';

        IF FOUND THEN
          UPDATE inventory
          SET stock = stock + rec.quantity,
              updated_at = NOW()
          WHERE product_id = rec.product_id AND warehouse = 'principal';
        END IF;

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

        -- Record entry movement
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

-- ===================================================
-- PARTE 4: Agregar columna status a inventory
-- ===================================================
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'available'
  CHECK (status IN ('available', 'pending', 'blocked'));

-- ===================================================
-- PARTE 5: Agregar columnas de verificación a purchases
-- ===================================================
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (verification_status IN ('pending', 'in_review', 'verified', 'rejected'));
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id);

-- ===================================================
-- PARTE 6: Agregar columnas de verificación a purchase_items
-- ===================================================
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS verified_qty INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS rejected_qty INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id);
