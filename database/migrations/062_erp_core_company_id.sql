-- ============================================================
-- MIGRACIÓN 062: company_id en el NÚCLEO ERP (29 tablas)
-- ------------------------------------------------------------
-- Objetivo: extender el aislamiento multi-tenant (Fase 1) a las
-- tablas core del ERP que aún carecen de company_id.
--
--   A) ADD COLUMN company_id + backfill DEFAULT + NOT NULL + índice
--   B) Parchear 6 funciones trigger activas que INSERTAN en
--      inventory / inventory_movements (para propagar company_id)
--   C) sale_items: trigger inteligente (deriva de sales) en vez de
--      auto_assign (sp_create_sale inserta sin company_id)
--   D) Re-aplicar trg_auto_company_id (loop de 061) + backfill
--   E) RLS policies genéricas para las 29 tablas nuevas
--   F) Verificación
-- ============================================================

-- ============================================================
-- A) NÚCLEO ERP: 29 tablas que pasan a TENANT
-- ============================================================
DO $$
DECLARE
  t TEXT;
  n INTEGER := 0;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','product_variants','product_reviews','categories',
    'inventory','inventory_movements','inventory_reservations',
    'sale_items','purchases','purchase_items','suppliers','tax_rates','warehouses',
    'goods_receipts','goods_receipt_items','cart_items','carts',
    'offers','hero_slides','floating_banners','ecommerce_banners',
    'user_notifications','form_workflows','form_workflow_logs',
    'quality_inspections','quality_inspection_items','support_sessions',
    'taxpayer_info','client_credit_accounts'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS company_id uuid', t);
    EXECUTE format(
      'UPDATE %I SET company_id = ''00000000-0000-0000-0000-000000000001'' WHERE company_id IS NULL',
      t
    );
    EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', t);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_company_id ON %I (company_id)',
      replace(t, '_backup_', 'bak_'), t
    );
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'company_id añadido a % tablas', n;
END $$;

-- ============================================================
-- B) PARCHES A FUNCIONES TRIGGER ACTIVAS
-- ============================================================

-- B.1) create_inventory_on_product_insert (010): INSERT INTO inventory
--      (AFTER INSERT ON products → NEW.company_id)
CREATE OR REPLACE FUNCTION create_inventory_on_product_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory (product_id, warehouse, stock, min_stock, max_stock, company_id)
  VALUES (
    NEW.id,
    'principal',
    0,
    COALESCE(NEW.min_stock, 5),
    NEW.max_stock,
    NEW.company_id
  )
  ON CONFLICT (product_id, warehouse) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B.2) update_product_cost_from_purchase (009): INSERT INTO inventory
--      + inventory_movements (AFTER INSERT ON purchase_items)
CREATE OR REPLACE FUNCTION update_product_cost_from_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_id UUID;
  v_purchase_date TIMESTAMPTZ;
  v_company_id UUID;
BEGIN
  SELECT supplier_id, created_at, company_id INTO v_supplier_id, v_purchase_date, v_company_id
  FROM purchases WHERE id = NEW.purchase_id;

  UPDATE products
  SET cost_price = NEW.unit_price,
      updated_at = NOW()
  WHERE id = NEW.product_id;

  INSERT INTO inventory (product_id, warehouse, stock, supplier_id, entry_date, movement_date, total_price, company_id)
  VALUES (
    NEW.product_id,
    'principal',
    NEW.quantity,
    v_supplier_id,
    v_purchase_date,
    NOW(),
    NEW.quantity * NEW.unit_price,
    v_company_id
  )
  ON CONFLICT (product_id, warehouse)
  DO UPDATE SET
    stock = inventory.stock + NEW.quantity,
    supplier_id = COALESCE(v_supplier_id, inventory.supplier_id),
    total_price = inventory.total_price + (NEW.quantity * NEW.unit_price),
    movement_date = NOW(),
    updated_at = NOW();

  INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, company_id)
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
    p.user_id,
    v_company_id
  FROM purchases p
  LEFT JOIN inventory i ON i.product_id = NEW.product_id AND i.warehouse = 'principal'
  WHERE p.id = NEW.purchase_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B.3) decrease_stock_from_sale (025): INSERT INTO inventory_movements
--      (AFTER INSERT ON sale_items → company de sales)
CREATE OR REPLACE FUNCTION decrease_stock_from_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
  v_inv_current_stock INTEGER;
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
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

    UPDATE product_variants
    SET stock = stock - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.variant_id;

    SELECT stock INTO v_inv_current_stock
    FROM inventory
    WHERE product_id = NEW.product_id AND warehouse = 'principal';

    IF FOUND THEN
      UPDATE inventory
      SET stock = GREATEST(0, stock - NEW.quantity),
          updated_at = NOW()
      WHERE product_id = NEW.product_id AND warehouse = 'principal';
    END IF;

    INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, variant_id, company_id)
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
      NEW.variant_id,
      s.company_id
    FROM sales s
    WHERE s.id = NEW.sale_id;
  ELSE
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

    UPDATE inventory
    SET stock = stock - NEW.quantity,
        movement_date = NOW(),
        total_price = GREATEST(0, total_price - (NEW.quantity * NEW.unit_price)),
        updated_at = NOW()
    WHERE product_id = NEW.product_id AND warehouse = 'principal';

    INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, company_id)
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
      s.user_id,
      s.company_id
    FROM sales s
    WHERE s.id = NEW.sale_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B.4) revert_stock_on_sale_cancel (025): INSERT INTO inventory_movements
--      (AFTER UPDATE ON sales → NEW.company_id)
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
        SELECT stock INTO v_current_stock
        FROM product_variants
        WHERE id = rec.variant_id;

        UPDATE product_variants
        SET stock = stock + rec.quantity,
            updated_at = NOW()
        WHERE id = rec.variant_id;

        SELECT stock INTO v_inv_current_stock
        FROM inventory
        WHERE product_id = rec.product_id AND warehouse = 'principal';

        IF FOUND THEN
          UPDATE inventory
          SET stock = stock + rec.quantity,
              updated_at = NOW()
          WHERE product_id = rec.product_id AND warehouse = 'principal';
        END IF;

        INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, variant_id, company_id)
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
          rec.variant_id,
          NEW.company_id
        );
      ELSE
        SELECT stock INTO v_current_stock
        FROM inventory
        WHERE product_id = rec.product_id AND warehouse = 'principal';

        UPDATE inventory
        SET stock = stock + rec.quantity,
            movement_date = NOW(),
            total_price = GREATEST(0, total_price + (rec.quantity * rec.unit_price)),
            updated_at = NOW()
        WHERE product_id = rec.product_id AND warehouse = 'principal';

        INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, company_id)
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
          NEW.user_id,
          NEW.company_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B.5) revert_inventory_on_purchase_cancel (009): INSERT INTO inventory_movements
--      (AFTER UPDATE ON purchases → NEW.company_id)
CREATE OR REPLACE FUNCTION revert_inventory_on_purchase_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    UPDATE inventory i
    SET stock = i.stock - pi.quantity,
        total_price = GREATEST(0, i.total_price - (pi.quantity * pi.unit_price)),
        movement_date = NOW(),
        updated_at = NOW()
    FROM purchase_items pi
    WHERE pi.purchase_id = NEW.id
      AND pi.product_id = i.product_id
      AND i.warehouse = 'principal';

    INSERT INTO inventory_movements (product_id, warehouse, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, user_id, company_id)
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
      NEW.user_id,
      NEW.company_id
    FROM purchase_items pi
    JOIN inventory i ON i.product_id = pi.product_id AND i.warehouse = 'principal'
    WHERE pi.purchase_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B.6) fn_process_approved_inspection (ad hoc en BD): INSERT INTO inventory
--      + inventory_movements (AFTER UPDATE ON quality_inspections → NEW.company_id)
CREATE OR REPLACE FUNCTION public.fn_process_approved_inspection()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_item RECORD;
  v_inventory_id UUID;
  v_warehouse_id UUID;
  v_purchase_id UUID;
BEGIN
  IF NEW.status IN ('approved', 'partial') AND OLD.status NOT IN ('approved', 'partial') THEN
    SELECT gr.warehouse_id, gr.purchase_id
    INTO v_warehouse_id, v_purchase_id
    FROM goods_receipts gr
    WHERE gr.id = NEW.goods_receipt_id;

    IF v_warehouse_id IS NULL THEN
      SELECT id INTO v_warehouse_id FROM warehouses WHERE is_main LIMIT 1;
    END IF;

    FOR v_item IN
      SELECT qii.product_id, qii.accepted_quantity, qii.rejected_quantity, gri.unit_cost
      FROM quality_inspection_items qii
      LEFT JOIN goods_receipt_items gri ON gri.id = qii.goods_receipt_item_id
      WHERE qii.quality_inspection_id = NEW.id AND qii.accepted_quantity > 0
    LOOP
      INSERT INTO inventory (product_id, warehouse_id, stock, available, avg_cost, last_cost, company_id)
      VALUES (v_item.product_id, v_warehouse_id, v_item.accepted_quantity, v_item.accepted_quantity, v_item.unit_cost, v_item.unit_cost, NEW.company_id)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
        stock = inventory.stock + v_item.accepted_quantity,
        avg_cost = (inventory.avg_cost * inventory.stock + v_item.unit_cost * v_item.accepted_quantity) / (inventory.stock + v_item.accepted_quantity),
        last_cost = v_item.unit_cost,
        updated_at = NOW();

      INSERT INTO inventory_movements (
        product_id, warehouse, type, quantity, previous_stock, new_stock,
        reference_type, reference_id, unit_cost, total_cost, user_id,
        is_automated, notes, company_id
      ) VALUES (
        v_item.product_id,
        (SELECT name FROM warehouses WHERE id = v_warehouse_id),
        'entry_purchase',
        v_item.accepted_quantity,
        COALESCE((SELECT stock FROM inventory WHERE product_id = v_item.product_id AND warehouse_id = v_warehouse_id) - v_item.accepted_quantity, 0),
        COALESCE((SELECT stock FROM inventory WHERE product_id = v_item.product_id AND warehouse_id = v_warehouse_id), v_item.accepted_quantity),
        'quality_inspection', NEW.id,
        v_item.unit_cost, v_item.unit_cost * v_item.accepted_quantity,
        NEW.inspected_by,
        true,
        'Entrada automática por inspección aprobada',
        NEW.company_id
      );
    END LOOP;

    IF v_purchase_id IS NOT NULL THEN
      UPDATE purchases SET
        status = 'entered_inventory',
        entered_inventory_at = NOW(),
        entered_inventory_by = NEW.inspected_by
      WHERE id = v_purchase_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- C) sale_items: trigger inteligente (company desde sales)
--    sp_create_sale (RPC) inserta sale_items SIN company_id;
--    auto_assign asignaría DEFAULT (claims vacíos en service_role).
--    En su lugar: derivar de la venta padre.
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_assign_sale_item_company()
RETURNS trigger AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.sale_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM sales WHERE id = NEW.sale_id;
  END IF;
  IF NEW.company_id IS NULL THEN
    NEW.company_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_company_id ON sale_items;
DROP TRIGGER IF EXISTS trg_sale_item_company ON sale_items;
CREATE TRIGGER trg_sale_item_company
  BEFORE INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_sale_item_company();

-- ============================================================
-- D) Re-aplicar trg_auto_company_id a TODAS las tablas con
--    company_id que aún no lo tengan (incluye las 29 nuevas,
--    inventory_movements, etc.) + backfill NULL → DEFAULT.
-- ============================================================
DO $$
DECLARE
  t TEXT;
  n INTEGER := 0;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = 'public'
          AND col.table_name = c.relname
          AND col.column_name = 'company_id'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_trigger tg
        WHERE tg.tgrelid = c.oid
          AND tg.tgfoid = 'auto_assign_company_id()'::regprocedure
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_company_id ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_auto_company_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id()',
      t
    );
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'trg_auto_company_id aplicado a % tablas', n;
END $$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = 'public'
          AND col.table_name = c.relname
          AND col.column_name = 'company_id'
      )
  LOOP
    EXECUTE format(
      'UPDATE %I SET company_id = ''00000000-0000-0000-0000-000000000001'' WHERE company_id IS NULL',
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- E) RLS: políticas genéricas para las 29 tablas nuevas
--    (solo afectan acceso directo vía PostgREST/anon; el gateway
--     usa service_role que las salta; fallback seguro → DEFAULT)
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','product_variants','product_reviews','categories',
    'inventory','inventory_movements','inventory_reservations',
    'sale_items','purchases','purchase_items','suppliers','tax_rates','warehouses',
    'goods_receipts','goods_receipt_items','cart_items','carts',
    'offers','hero_slides','floating_banners','ecommerce_banners',
    'user_notifications','form_workflows','form_workflow_logs',
    'quality_inspections','quality_inspection_items','support_sessions',
    'taxpayer_info','client_credit_accounts'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_access_%s" ON %I', t, t);
    EXECUTE format($p$
      CREATE POLICY "tenant_access_%s" ON %I
      USING (company_id = COALESCE((current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid, '00000000-0000-0000-0000-000000000001'::uuid))
      WITH CHECK (company_id = COALESCE((current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid, '00000000-0000-0000-0000-000000000001'::uuid))
    $p$, t, t);
  END LOOP;
END $$;

-- ============================================================
-- F) VERIFICACIÓN
-- ============================================================
SELECT c.relname AS tabla,
       (SELECT column_name FROM information_schema.columns col
        WHERE col.table_schema='public' AND col.table_name=c.relname AND col.column_name='company_id') AS tiene_company_id,
       (SELECT is_nullable FROM information_schema.columns col
        WHERE col.table_schema='public' AND col.table_name=c.relname AND col.column_name='company_id') AS nullable,
       count(*) FILTER (WHERE tg.tgfoid = 'auto_assign_company_id()'::regprocedure) AS auto_assign,
       count(*) FILTER (WHERE tg.tgfoid = 'auto_assign_sale_item_company()'::regprocedure) AS sale_item_trigger
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_trigger tg ON tg.tgrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'products','product_variants','product_reviews','categories',
    'inventory','inventory_movements','inventory_reservations',
    'sale_items','purchases','purchase_items','suppliers','tax_rates','warehouses',
    'goods_receipts','goods_receipt_items','cart_items','carts',
    'offers','hero_slides','floating_banners','ecommerce_banners',
    'user_notifications','form_workflows','form_workflow_logs',
    'quality_inspections','quality_inspection_items','support_sessions',
    'taxpayer_info','client_credit_accounts'
  )
GROUP BY c.relname
ORDER BY c.relname;
