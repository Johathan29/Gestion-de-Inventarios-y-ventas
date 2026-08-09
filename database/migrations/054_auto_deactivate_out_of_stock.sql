-- ============================================================
-- MIGRACIÓN 054: Auto-desactivar productos e ítems de inventario
-- cuando el stock llega a 0
-- ============================================================
-- Regla de negocio (requerimiento del cliente):
--   - products.status  = 'inactive'      cuando el STOCK TOTAL (suma de almacenes) es 0
--   - inventory.status = 'not_available' cuando el stock de ESE ítem/almacén es 0
--   - Al reabastecer (stock > 0) se restaura automáticamente:
--       products.status  = 'active'
--       inventory.status = 'available'
-- ============================================================

-- 1. Extender el CHECK de inventory.status para aceptar 'not_available'
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_status_check;
ALTER TABLE inventory ADD CONSTRAINT inventory_status_check
  CHECK (status IN ('available', 'pending', 'blocked', 'not_available'));

-- 2. Backfill: datos existentes (solo productos gestionados por inventario)
--    2a. Ítems de inventario agotados → not_available
UPDATE inventory SET status = 'not_available'
WHERE stock <= 0 AND status = 'available';

--    2b. Productos con inventario cuya suma de stock es 0 → inactive
UPDATE products p SET status = 'inactive', updated_at = NOW()
WHERE p.status = 'active'
  AND EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.id AND i.stock > 0);

-- 3. Función de sincronización (multi-almacén: considera el TOTAL del producto)
CREATE OR REPLACE FUNCTION sync_availability_on_stock_change()
RETURNS TRIGGER AS $$
DECLARE
  v_total_stock INTEGER;
  v_prev_total  INTEGER;
BEGIN
  -- Total de stock del producto excluyendo la fila actual (aún no persistida)
  SELECT COALESCE(SUM(stock), 0) INTO v_total_stock
  FROM inventory
  WHERE product_id = NEW.product_id AND (id IS DISTINCT FROM NEW.id);

  v_total_stock := v_total_stock + NEW.stock;

  -- Total anterior (solo UPDATE): para saber si el producto venía agotado.
  -- IMPORTANTE: usar TG_OP, NO `record IS NOT NULL` (que es FALSE si la fila
  -- tiene alguna columna NULL, ej. min_stock/movement_date, y rompía la reactivación).
  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(SUM(stock), 0) INTO v_prev_total
    FROM inventory
    WHERE product_id = NEW.product_id AND (id IS DISTINCT FROM NEW.id);
    v_prev_total := v_prev_total + OLD.stock;
  END IF;

  -- Este ítem/almacén agotado → no disponible
  IF NEW.stock <= 0 THEN
    NEW.status := 'not_available';
  ELSE
    -- Restaurar solo si venía de agotado (auto-desactivado)
    IF TG_OP = 'INSERT' OR OLD.stock <= 0 OR OLD.status = 'not_available' THEN
      NEW.status := 'available';
    END IF;
  END IF;

  -- Sincronizar el estado del producto según el stock TOTAL.
  -- La reactivación solo ocurre si el producto venía agotado (v_prev_total <= 0),
  -- de modo que un 'inactive' manual con stock disponible NO se revierte.
  IF v_total_stock <= 0 THEN
    UPDATE products SET status = 'inactive', updated_at = NOW()
    WHERE id = NEW.product_id AND status = 'active';
  ELSIF (TG_OP = 'INSERT' OR v_prev_total <= 0) THEN
    UPDATE products SET status = 'active', updated_at = NOW()
    WHERE id = NEW.product_id AND status = 'inactive';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger BEFORE INSERT / UPDATE OF stock (evita recursión: solo escribe NEW)
DROP TRIGGER IF EXISTS trg_inventory_sync_availability ON inventory;
CREATE TRIGGER trg_inventory_sync_availability
  BEFORE INSERT OR UPDATE OF stock ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION sync_availability_on_stock_change();

-- 5. Nota: la reactivación por restock usa v_prev_total (stock total anterior)
--    como guarda: un producto desactivado MANUALMENTE con stock disponible
--    NO se reactiva. Los 'draft'/'archived' (decisión manual) tampoco se tocan.
