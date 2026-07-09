-- ============================================================
-- Migration 016: Fix double inventory movement bug & improve triggers
-- ============================================================
-- Problema: El trigger trg_sale_item_decrease_stock y el código
-- de la aplicación (updateInventoryStock) ambos creaban movimientos
-- de inventario, resultando en el DOBLE descuento de stock.
--
-- Solución: Se eliminó updateInventoryStock de CreateSaleUseCase
-- y CheckoutUseCase. El trigger maneja el descuento principal.
-- Mejoramos el mensaje del trigger para ser más descriptivo.
-- ============================================================

-- 1. Reemplazar el trigger de sale_items con mejor mensaje
CREATE OR REPLACE FUNCTION decrease_stock_from_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  -- Obtener stock actual
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

  -- Registrar movimiento de salida (mensaje mejorado)
  INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id)
  SELECT
    NEW.product_id,
    'principal',
    'exit',
    NEW.quantity,
    v_current_stock,
    v_current_stock - NEW.quantity,
    'sale',
    NEW.sale_id,
    'Venta realizada',
    s.user_id
  FROM sales s
  WHERE s.id = NEW.sale_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear función para revertir stock al cancelar venta
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
      SELECT si.product_id, si.quantity, si.unit_price, si.product_name
      FROM sale_items si
      WHERE si.sale_id = NEW.id
    LOOP
      -- Obtener stock actual
      SELECT stock INTO v_current_stock
      FROM inventory
      WHERE product_id = rec.product_id AND warehouse = 'principal';

      -- Restaurar stock
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
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger para revertir stock al cancelar venta (solo si no existe)
DROP TRIGGER IF EXISTS trg_sale_cancel_revert_inventory ON sales;
CREATE TRIGGER trg_sale_cancel_revert_inventory
  AFTER UPDATE OF status ON sales
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled')
  EXECUTE FUNCTION revert_stock_on_sale_cancel();

-- 4. Nota: El trigger trg_sale_item_decrease_stock ahora usa "Venta realizada"
--    como razón, y el código de la aplicación ya no duplica el movimiento.
--    Para cancelaciones, el nuevo trigger trg_sale_cancel_revert_inventory
--    maneja la reversión a nivel BD como respaldo.

-- ============================================================
-- 5. NOTA: invoice_items NO SE CREA como tabla separada.
--    Los items de factura se obtienen dinámicamente desde
--    sale_items vía sale_id (ver invoice-service repository).
--    Esto evita duplicación de datos y la necesidad de DDL.
-- ============================================================

-- ============================================================
-- 6. Fix NCF unique constraint conflict
--    El UNIQUE DEFAULT '' impide crear más de una factura sin NCF.
--    PostgreSQL trata '' como valor no-nulo, por lo que UNIQUE
--    lo rechaza en la segunda inserción.
-- ============================================================
-- Eliminar constraint UNIQUE problemática y crear partial unique
-- que solo exija unicidad cuando ncf NO sea NULL y NO esté vacío
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_ncf_key;
DROP INDEX IF EXISTS idx_invoices_ncf;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_ncf_unique ON invoices(ncf) WHERE ncf IS NOT NULL AND ncf != '';

-- 7. Reset ncf a NULL para facturas existentes sin NCF
UPDATE invoices SET ncf = NULL WHERE ncf = '';
-- ============================================================
