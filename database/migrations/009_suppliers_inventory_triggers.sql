-- ===================================================
-- MIGRACIÓN 009: Proveedores, inventario mejorado y triggers
-- ===================================================

-- 1. AGREGAR CAMPOS A INVENTORY
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entry_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS movement_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(12,2) DEFAULT 0;

-- 2. ACTUALIZAR movement_date AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION update_inventory_movement_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.movement_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_movement_date ON inventory;
CREATE TRIGGER trg_inventory_movement_date
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_movement_date();

-- 3. TRIGGER: Al insertar en purchase_items → actualizar products.cost_price
CREATE OR REPLACE FUNCTION update_product_cost_from_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_id UUID;
  v_purchase_date TIMESTAMPTZ;
BEGIN
  -- Obtener supplier_id y fecha de la compra
  SELECT supplier_id, created_at INTO v_supplier_id, v_purchase_date
  FROM purchases WHERE id = NEW.purchase_id;

  -- Actualizar cost_price del producto con el último costo de compra
  UPDATE products
  SET cost_price = NEW.unit_price,
      updated_at = NOW()
  WHERE id = NEW.product_id;

  -- Insertar o actualizar inventario
  INSERT INTO inventory (product_id, warehouse, stock, supplier_id, entry_date, movement_date, total_price)
  VALUES (
    NEW.product_id,
    'principal',
    NEW.quantity,
    v_supplier_id,
    v_purchase_date,
    NOW(),
    NEW.quantity * NEW.unit_price
  )
  ON CONFLICT (product_id, warehouse)
  DO UPDATE SET
    stock = inventory.stock + NEW.quantity,
    supplier_id = COALESCE(v_supplier_id, inventory.supplier_id),
    total_price = inventory.total_price + (NEW.quantity * NEW.unit_price),
    movement_date = NOW(),
    updated_at = NOW();

  -- Registrar movimiento de inventario
  INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id)
  SELECT
    NEW.product_id,
    'principal',
    'entry',
    NEW.quantity,
    COALESCE(i.stock - NEW.quantity, 0),
    COALESCE(i.stock, NEW.quantity),
    'purchase',
    NEW.purchase_id,
    'Entrada por compra automática',
    p.user_id
  FROM purchases p
  LEFT JOIN inventory i ON i.product_id = NEW.product_id AND i.warehouse = 'principal'
  WHERE p.id = NEW.purchase_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_item_update_inventory ON purchase_items;
CREATE TRIGGER trg_purchase_item_update_inventory
  AFTER INSERT ON purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_cost_from_purchase();

-- 4. TRIGGER: Al insertar en sale_items → disminuir stock
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

  -- Registrar movimiento de salida
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
    'Salida por venta automática',
    s.user_id
  FROM sales s
  WHERE s.id = NEW.sale_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_item_decrease_stock ON sale_items;
CREATE TRIGGER trg_sale_item_decrease_stock
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION decrease_stock_from_sale();

-- 5. TRIGGER: Al cancelar compra → revertir inventario
CREATE OR REPLACE FUNCTION revert_inventory_on_purchase_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    -- Revertir items de la compra
    UPDATE inventory i
    SET stock = i.stock - pi.quantity,
        total_price = GREATEST(0, i.total_price - (pi.quantity * pi.unit_price)),
        movement_date = NOW(),
        updated_at = NOW()
    FROM purchase_items pi
    WHERE pi.purchase_id = NEW.id
      AND pi.product_id = i.product_id
      AND i.warehouse = 'principal';

    -- Registrar movimiento de reversión
    INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id)
    SELECT
      pi.product_id,
      'principal',
      'exit',
      pi.quantity,
      i.stock + pi.quantity,
      i.stock,
      'purchase_cancel',
      NEW.id,
      'Reversión por cancelación de compra',
      NEW.user_id
    FROM purchase_items pi
    JOIN inventory i ON i.product_id = pi.product_id AND i.warehouse = 'principal'
    WHERE pi.purchase_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_cancel_revert_inventory ON purchases;
CREATE TRIGGER trg_purchase_cancel_revert_inventory
  AFTER UPDATE OF status ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION revert_inventory_on_purchase_cancel();

-- 6. TRIGGER: Al crear compra → notificación
CREATE OR REPLACE FUNCTION notify_purchase_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT
    u.id,
    'purchase',
    'Nueva compra registrada',
    'Compra #' || NEW.purchase_number || ' por $' || ROUND(NEW.total::numeric, 2),
    jsonb_build_object('purchase_id', NEW.id, 'purchase_number', NEW.purchase_number, 'total', NEW.total)
  FROM users u
  WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
    AND u.is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_notify ON purchases;
CREATE TRIGGER trg_purchase_notify
  AFTER INSERT ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION notify_purchase_created();

-- 7. ACTUALIZAR VISTA vw_products_with_stock para incluir proveedor
DROP VIEW IF EXISTS vw_products_with_stock;
CREATE OR REPLACE VIEW vw_products_with_stock AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.barcode,
  p.price,
  p.cost_price,
  p.category_id,
  c.name AS category_name,
  p.brand,
  i.supplier_id,
  s.name AS supplier_name,
  COALESCE(i.stock, 0) AS current_stock,
  i.min_stock,
  i.warehouse,
  i.entry_date,
  i.movement_date,
  i.total_price,
  CASE
    WHEN COALESCE(i.stock, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(i.stock, 0) <= i.min_stock THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status,
  p.status,
  p.featured,
  p.images
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN LATERAL (
  SELECT stock, min_stock, warehouse, supplier_id, entry_date, movement_date, total_price
  FROM inventory
  WHERE product_id = p.id
  ORDER BY warehouse = 'principal' DESC
  LIMIT 1
) i ON true
LEFT JOIN suppliers s ON s.id = i.supplier_id;

-- 8. VISTA DE INVENTARIO DETALLADO
CREATE OR REPLACE VIEW vw_inventory_detail AS
SELECT
  i.id,
  i.product_id,
  p.name AS product_name,
  p.sku,
  p.barcode,
  c.name AS category_name,
  i.warehouse,
  i.stock,
  i.min_stock,
  i.max_stock,
  i.location,
  i.supplier_id,
  s.name AS supplier_name,
  s.contact_name AS supplier_contact,
  s.phone AS supplier_phone,
  i.entry_date,
  i.movement_date,
  i.total_price,
  p.cost_price,
  p.price,
  (i.stock * p.cost_price) AS inventory_value,
  CASE
    WHEN COALESCE(i.stock, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(i.stock, 0) <= i.min_stock THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status,
  i.created_at,
  i.updated_at
FROM inventory i
JOIN products p ON p.id = i.product_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN suppliers s ON s.id = i.supplier_id;
