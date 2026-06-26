-- ===================================================
-- MIGRACIÓN 010: Mejoras en purchase_items + trigger products
--   - Agrega product_image, barcode a purchase_items
--   - Trigger: auto-crear inventario al insertar producto
--   - Vista de detalle de compras mejorada
-- ===================================================

-- 1. AGREGAR CAMPOS A purchase_items
ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS product_image TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) DEFAULT '';

-- 2. TRIGGER: Al insertar un producto → crear registro en inventario automáticamente
CREATE OR REPLACE FUNCTION create_inventory_on_product_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory (product_id, warehouse, stock, min_stock, max_stock)
  VALUES (
    NEW.id,
    'principal',
    0,
    COALESCE(NEW.min_stock, 5),
    NEW.max_stock
  )
  ON CONFLICT (product_id, warehouse) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_create_inventory ON products;
CREATE TRIGGER trg_product_create_inventory
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION create_inventory_on_product_insert();

-- 3. VISTA DE DETALLE DE COMPRAS (para frontend)
DROP VIEW IF EXISTS vw_purchase_detail;
CREATE OR REPLACE VIEW vw_purchase_detail AS
SELECT
  p.id AS purchase_id,
  p.purchase_number,
  p.status,
  p.subtotal,
  p.tax,
  p.discount,
  p.total,
  p.notes AS purchase_notes,
  p.created_at AS purchase_date,
  p.received_at,
  -- Proveedor
  s.id AS supplier_id,
  s.name AS supplier_name,
  s.contact_name AS supplier_contact,
  s.email AS supplier_email,
  s.phone AS supplier_phone,
  s.address AS supplier_address,
  s.city AS supplier_city,
  s.tax_id AS supplier_tax_id,
  -- Usuario
  u.name AS user_name,
  -- Items
  pi.id AS item_id,
  pi.product_id,
  pi.product_name,
  pi.sku,
  pi.barcode,
  pi.product_image,
  pi.quantity,
  pi.unit_price,
  pi.discount AS item_discount,
  pi.tax AS item_tax,
  pi.total AS item_total,
  (pi.quantity * pi.unit_price) AS item_subtotal,
  -- Producto
  pr.images AS product_images,
  pr.brand AS product_brand
FROM purchases p
LEFT JOIN suppliers s ON s.id = p.supplier_id
LEFT JOIN users u ON u.id = p.user_id
LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
LEFT JOIN products pr ON pr.id = pi.product_id;

-- 4. ACTUALIZAR VISTA de productos con stock (agregar barcode si no está)
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
  ORDER BY warehouse = 'principal' DESC, updated_at DESC
  LIMIT 1
) i ON true
LEFT JOIN suppliers s ON s.id = i.supplier_id;
