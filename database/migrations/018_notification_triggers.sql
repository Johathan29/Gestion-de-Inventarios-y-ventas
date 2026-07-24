-- ============================================================
-- MIGRATION 018: Notification Triggers for System Events
-- ============================================================
-- Crea disparadores (triggers) que insertan notificaciones
-- automáticamente en user_notifications cuando ocurren eventos
-- clave en el sistema.
--
-- Tipos de notificación usados:
--   'sale'      → Ventas
--   'purchase'  → Compras (existente en 009, mejorado aquí)
--   'inventory' → Movimientos de inventario
--   'stock'     → Stock bajo
--   'info'      → Usuarios, categorías, proveedores, facturas, ecommerce
--   'login'     → Inicio de sesión
-- ============================================================

-- ============================================================
-- 1. VENTAS: Notificar cuando se crea una venta
-- ============================================================
CREATE OR REPLACE FUNCTION notify_sale_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT
    u.id,
    'sale',
    'Nueva venta registrada',
    'Venta #' || NEW.sale_number || ' por $' || ROUND(NEW.total::numeric, 2),
    jsonb_build_object(
      'sale_id', NEW.id,
      'sale_number', NEW.sale_number,
      'total', NEW.total,
      'payment_method', NEW.payment_method,
      'url', '/app/sales/' || NEW.id
    )
  FROM users u
  WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
    AND u.is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_notify ON sales;
CREATE TRIGGER trg_sale_notify
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION notify_sale_created();


-- ============================================================
-- 2. COMPRAS: Notificar cuando se crea una compra
--    (Mejora del trigger existente en 009 con url)
-- ============================================================
CREATE OR REPLACE FUNCTION notify_purchase_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT
    u.id,
    'purchase',
    'Nueva compra registrada',
    'Compra #' || NEW.purchase_number || ' por $' || ROUND(NEW.total::numeric, 2),
    jsonb_build_object(
      'purchase_id', NEW.id,
      'purchase_number', NEW.purchase_number,
      'total', NEW.total,
      'url', '/app/purchases/' || NEW.id
    )
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


-- ============================================================
-- 3. INVENTARIO: Notificar cambios de stock
-- ============================================================
CREATE OR REPLACE FUNCTION notify_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
  v_product_name VARCHAR(255);
BEGIN
  IF OLD.stock IS DISTINCT FROM NEW.stock THEN
    SELECT name INTO v_product_name FROM products WHERE id = NEW.product_id;

    INSERT INTO user_notifications (user_id, type, title, message, data)
    SELECT
      u.id,
      'inventory',
      'Inventario actualizado',
      v_product_name || ': stock ' || OLD.stock || ' → ' || NEW.stock || ' (' || NEW.warehouse || ')',
      jsonb_build_object(
        'product_id', NEW.product_id,
        'product_name', v_product_name,
        'old_stock', OLD.stock,
        'new_stock', NEW.stock,
        'warehouse', NEW.warehouse,
        'url', '/app/products/' || NEW.product_id
      )
    FROM users u
    WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
      AND u.is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_notify ON inventory;
CREATE TRIGGER trg_inventory_notify
  AFTER UPDATE ON inventory
  FOR EACH ROW
  WHEN (OLD.stock IS DISTINCT FROM NEW.stock)
  EXECUTE FUNCTION notify_inventory_change();


-- ============================================================
-- 4. STOCK BAJO: Notificar cuando el stock cae por debajo del mínimo
-- ============================================================
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_product_name VARCHAR(255);
BEGIN
  SELECT name INTO v_product_name FROM products WHERE id = NEW.product_id;

  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT
    u.id,
    'stock',
    'Stock bajo: ' || v_product_name,
    v_product_name || ' tiene solo ' || NEW.stock || ' unidades (mínimo: ' || NEW.min_stock || ')',
    jsonb_build_object(
      'product_id', NEW.product_id,
      'product_name', v_product_name,
      'stock', NEW.stock,
      'min_stock', NEW.min_stock,
      'warehouse', NEW.warehouse,
      'url', '/app/products/' || NEW.product_id
    )
  FROM users u
  WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
    AND u.is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_low_stock_notify ON inventory;
CREATE TRIGGER trg_low_stock_notify
  AFTER UPDATE ON inventory
  FOR EACH ROW
  WHEN (NEW.stock > 0 AND NEW.stock <= NEW.min_stock AND OLD.stock IS DISTINCT FROM NEW.stock)
  EXECUTE FUNCTION notify_low_stock();


-- ============================================================
-- 5. USUARIOS: Notificar cuando se registra un usuario nuevo
-- ============================================================
CREATE OR REPLACE FUNCTION notify_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT
    u.id,
    'info',
    'Nuevo usuario registrado',
    NEW.name || ' (' || NEW.email || ') se ha registrado en el sistema',
    jsonb_build_object(
      'user_id', NEW.id,
      'user_name', NEW.name,
      'user_email', NEW.email,
      'url', '/app/profile'
    )
  FROM users u
  WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin'))
    AND u.is_active = true
    AND u.id != NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_new_user_notify ON users;
CREATE TRIGGER trg_new_user_notify
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_user();


-- ============================================================
-- 6. INICIO DE SESIÓN: Notificar cuando un usuario inicia sesión
--    (Detecta cambios en last_login)
-- ============================================================
CREATE OR REPLACE FUNCTION notify_user_login()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.last_login IS DISTINCT FROM NEW.last_login AND NEW.last_login IS NOT NULL THEN
    INSERT INTO user_notifications (user_id, type, title, message, data)
    SELECT
      u.id,
      'login',
      'Inicio de sesión',
      NEW.name || ' ha iniciado sesión',
      jsonb_build_object(
        'user_id', NEW.id,
        'user_name', NEW.name,
        'login_at', NEW.last_login,
        'url', '/app/profile'
      )
    FROM users u
    WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin'))
      AND u.is_active = true
      AND u.id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_login_notify ON users;
CREATE TRIGGER trg_user_login_notify
  AFTER UPDATE OF last_login ON users
  FOR EACH ROW
  WHEN (OLD.last_login IS DISTINCT FROM NEW.last_login AND NEW.last_login IS NOT NULL)
  EXECUTE FUNCTION notify_user_login();


-- ============================================================
-- 7. CATEGORÍAS: Notificar creación o modificación
-- ============================================================
CREATE OR REPLACE FUNCTION notify_category_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_notifications (user_id, type, title, message, data)
    SELECT
      u.id,
      'info',
      'Nueva categoría creada',
      'Categoría "' || NEW.name || '" creada',
      jsonb_build_object(
        'category_id', NEW.id,
        'category_name', NEW.name,
        'url', '/app/categories/' || NEW.id
      )
    FROM users u
    WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
      AND u.is_active = true;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name OR OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO user_notifications (user_id, type, title, message, data)
      SELECT
        u.id,
        'info',
        'Categoría modificada',
        'Categoría "' || NEW.name || '" ha sido actualizada',
        jsonb_build_object(
          'category_id', NEW.id,
          'category_name', NEW.name,
          'url', '/app/categories/' || NEW.id
        )
      FROM users u
      WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
        AND u.is_active = true;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_notify_insert ON categories;
CREATE TRIGGER trg_category_notify_insert
  AFTER INSERT ON categories
  FOR EACH ROW
  EXECUTE FUNCTION notify_category_change();

DROP TRIGGER IF EXISTS trg_category_notify_update ON categories;
CREATE TRIGGER trg_category_notify_update
  AFTER UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION notify_category_change();


-- ============================================================
-- 8. PROVEEDORES: Notificar creación o modificación
-- ============================================================
CREATE OR REPLACE FUNCTION notify_supplier_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_notifications (user_id, type, title, message, data)
    SELECT
      u.id,
      'purchase',
      'Nuevo proveedor registrado',
      'Proveedor "' || NEW.name || '" registrado',
      jsonb_build_object(
        'supplier_id', NEW.id,
        'supplier_name', NEW.name,
        'url', '/app/suppliers/' || NEW.id
      )
    FROM users u
    WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
      AND u.is_active = true;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name OR OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      INSERT INTO user_notifications (user_id, type, title, message, data)
      SELECT
        u.id,
        'purchase',
        'Proveedor modificado',
        'Proveedor "' || NEW.name || '" ha sido actualizado',
        jsonb_build_object(
          'supplier_id', NEW.id,
          'supplier_name', NEW.name,
          'url', '/app/suppliers/' || NEW.id
        )
      FROM users u
      WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
        AND u.is_active = true;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supplier_notify_insert ON suppliers;
CREATE TRIGGER trg_supplier_notify_insert
  AFTER INSERT ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION notify_supplier_change();

DROP TRIGGER IF EXISTS trg_supplier_notify_update ON suppliers;
CREATE TRIGGER trg_supplier_notify_update
  AFTER UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION notify_supplier_change();


-- ============================================================
-- 9. FACTURAS: Notificar cuando se crea una factura
-- ============================================================
CREATE OR REPLACE FUNCTION notify_invoice_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT
    u.id,
    'info',
    'Nueva factura generada',
    'Factura #' || NEW.invoice_number || ' por $' || ROUND(NEW.total::numeric, 2),
    jsonb_build_object(
      'invoice_id', NEW.id,
      'invoice_number', NEW.invoice_number,
      'total', NEW.total,
      'url', '/app/invoices/' || NEW.id
    )
  FROM users u
  WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
    AND u.is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_notify ON invoices;
CREATE TRIGGER trg_invoice_notify
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_invoice_created();


-- ============================================================
-- 10. ECOMMERCE: Notificar cambios en hero_slides
-- ============================================================
CREATE OR REPLACE FUNCTION notify_ecommerce_hero_slide_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'creado'
    WHEN 'UPDATE' THEN 'modificado'
    WHEN 'DELETE' THEN 'eliminado'
  END;

  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT
    u.id,
    'info',
    'Hero Slide ' || v_action,
    'Slide "' || COALESCE(NEW.title_line1, OLD.title_line1, '') || '" ' || v_action || ' en el carrusel',
    jsonb_build_object(
      'hero_slide_id', COALESCE(NEW.id, OLD.id),
      'action', v_action
    )
  FROM users u
  WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
    AND u.is_active = true;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hero_slide_notify_insert ON hero_slides;
CREATE TRIGGER trg_hero_slide_notify_insert
  AFTER INSERT ON hero_slides
  FOR EACH ROW
  EXECUTE FUNCTION notify_ecommerce_hero_slide_change();

DROP TRIGGER IF EXISTS trg_hero_slide_notify_update ON hero_slides;
CREATE TRIGGER trg_hero_slide_notify_update
  AFTER UPDATE ON hero_slides
  FOR EACH ROW
  EXECUTE FUNCTION notify_ecommerce_hero_slide_change();

DROP TRIGGER IF EXISTS trg_hero_slide_notify_delete ON hero_slides;
CREATE TRIGGER trg_hero_slide_notify_delete
  AFTER DELETE ON hero_slides
  FOR EACH ROW
  EXECUTE FUNCTION notify_ecommerce_hero_slide_change();


-- ============================================================
-- 11. ECOMMERCE: Notificar cambios en floating_banners
-- ============================================================
CREATE OR REPLACE FUNCTION notify_ecommerce_banner_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'creado'
    WHEN 'UPDATE' THEN 'modificado'
    WHEN 'DELETE' THEN 'eliminado'
  END;

  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT
    u.id,
    'info',
    'Banner flotante ' || v_action,
    'Banner "' || COALESCE(NEW.title, OLD.title, '') || '" ' || v_action || ' en la tienda',
    jsonb_build_object(
      'banner_id', COALESCE(NEW.id, OLD.id),
      'action', v_action
    )
  FROM users u
  WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
    AND u.is_active = true;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_floating_banner_notify_insert ON floating_banners;
CREATE TRIGGER trg_floating_banner_notify_insert
  AFTER INSERT ON floating_banners
  FOR EACH ROW
  EXECUTE FUNCTION notify_ecommerce_banner_change();

DROP TRIGGER IF EXISTS trg_floating_banner_notify_update ON floating_banners;
CREATE TRIGGER trg_floating_banner_notify_update
  AFTER UPDATE ON floating_banners
  FOR EACH ROW
  EXECUTE FUNCTION notify_ecommerce_banner_change();

DROP TRIGGER IF EXISTS trg_floating_banner_notify_delete ON floating_banners;
CREATE TRIGGER trg_floating_banner_notify_delete
  AFTER DELETE ON floating_banners
  FOR EACH ROW
  EXECUTE FUNCTION notify_ecommerce_banner_change();


-- ============================================================
-- 12. ECOMMERCE: Notificar cambios en offers
-- ============================================================
CREATE OR REPLACE FUNCTION notify_ecommerce_offer_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_product_name VARCHAR(255);
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'creada'
    WHEN 'UPDATE' THEN 'modificada'
    WHEN 'DELETE' THEN 'eliminada'
  END;

  SELECT name INTO v_product_name FROM products WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT
    u.id,
    'info',
    'Oferta ' || v_action,
    'Oferta para "' || v_product_name || '" ' || v_action || ' (' || COALESCE(NEW.discount_percent, OLD.discount_percent, 0) || '% descuento)',
    jsonb_build_object(
      'offer_id', COALESCE(NEW.id, OLD.id),
      'product_id', COALESCE(NEW.product_id, OLD.product_id),
      'product_name', v_product_name,
      'discount_percent', COALESCE(NEW.discount_percent, OLD.discount_percent, 0),
      'action', v_action,
      'url', '/app/products/' || COALESCE(NEW.product_id, OLD.product_id)
    )
  FROM users u
  WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'supervisor'))
    AND u.is_active = true;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offer_notify_insert ON offers;
CREATE TRIGGER trg_offer_notify_insert
  AFTER INSERT ON offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_ecommerce_offer_change();

DROP TRIGGER IF EXISTS trg_offer_notify_update ON offers;
CREATE TRIGGER trg_offer_notify_update
  AFTER UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_ecommerce_offer_change();

DROP TRIGGER IF EXISTS trg_offer_notify_delete ON offers;
CREATE TRIGGER trg_offer_notify_delete
  AFTER DELETE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_ecommerce_offer_change();


-- ============================================================
-- 13. ECOMMERCE: Notificar cambios en ecommerce_settings
-- ============================================================
CREATE OR REPLACE FUNCTION notify_ecommerce_settings_change()
RETURNS TRIGGER AS $$
DECLARE
  v_changes TEXT[];
  v_diff TEXT;
BEGIN
  v_changes := ARRAY[]::TEXT[];

  IF OLD.store_name IS DISTINCT FROM NEW.store_name THEN
    v_changes := array_append(v_changes, 'nombre de tienda');
  END IF;
  IF OLD.currency_code IS DISTINCT FROM NEW.currency_code THEN
    v_changes := array_append(v_changes, 'moneda');
  END IF;
  IF OLD.default_tax_rate_id IS DISTINCT FROM NEW.default_tax_rate_id THEN
    v_changes := array_append(v_changes, 'impuesto');
  END IF;
  IF OLD.logo_url IS DISTINCT FROM NEW.logo_url THEN
    v_changes := array_append(v_changes, 'logo');
  END IF;
  IF OLD.favicon_url IS DISTINCT FROM NEW.favicon_url THEN
    v_changes := array_append(v_changes, 'favicon');
  END IF;
  IF OLD.contact_email IS DISTINCT FROM NEW.contact_email THEN
    v_changes := array_append(v_changes, 'email de contacto');
  END IF;

  IF array_length(v_changes, 1) IS NOT NULL THEN
    v_diff := array_to_string(v_changes, ', ');

    INSERT INTO user_notifications (user_id, type, title, message, data)
    SELECT
      u.id,
      'info',
      'Configuración de tienda actualizada',
      'Cambios en: ' || v_diff,
      jsonb_build_object(
        'changes', v_diff,
        'settings_id', NEW.id,
        'url', '/app/admin/config'
      )
    FROM users u
    WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('admin'))
      AND u.is_active = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ecommerce_settings_notify ON ecommerce_settings;
CREATE TRIGGER trg_ecommerce_settings_notify
  AFTER UPDATE ON ecommerce_settings
  FOR EACH ROW
  EXECUTE FUNCTION notify_ecommerce_settings_change();


-- ============================================================
-- RESUMEN DE TRIGGERS CREADOS:
-- ============================================================
-- 1. trg_sale_notify              → sales (INSERT)
-- 2. trg_purchase_notify          → purchases (INSERT) [reemplaza 009]
-- 3. trg_inventory_notify         → inventory (UPDATE stock)
-- 4. trg_low_stock_notify         → inventory (UPDATE stock bajo)
-- 5. trg_new_user_notify          → users (INSERT)
-- 6. trg_user_login_notify        → users (UPDATE last_login)
-- 7. trg_category_notify_insert   → categories (INSERT)
--    trg_category_notify_update   → categories (UPDATE)
-- 8. trg_supplier_notify_insert   → suppliers (INSERT)
--    trg_supplier_notify_update   → suppliers (UPDATE)
-- 9. trg_invoice_notify           → invoices (INSERT)
-- 10. trg_hero_slide_notify_*     → hero_slides (INSERT/UPDATE/DELETE)
-- 11. trg_floating_banner_notify_* → floating_banners (INSERT/UPDATE/DELETE)
-- 12. trg_offer_notify_*          → offers (INSERT/UPDATE/DELETE)
-- 13. trg_ecommerce_settings_notify → ecommerce_settings (UPDATE)
-- ============================================================
