-- ============================================================================
-- MIGRATION 030: TRIGGERS & FUNCTIONS — Lógica en base de datos
-- ============================================================================
-- Fecha: 2026-07-24
-- Propósito: Funciones SQL y triggers para:
--   1. Auto-update de updated_at
--   2. Auto-cálculo de previous_balance/new_balance en inventory_ledger
--   3. Refresh de inventory_balances materialized view
--   4. Publicación de eventos via transactional outbox
--   5. Validación de integridad en inventario
--   6. Auto-assign de company_id
-- Riesgo: MEDIO (crea funciones y triggers)
-- ============================================================================

BEGIN;


-- ============================================================================
-- 1. TRIGGER: Auto-update updated_at en todas las tablas
-- ============================================================================

-- Función genérica
CREATE OR REPLACE FUNCTION public.auto_assign_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_claim_company uuid;
BEGIN
  -- If NEW already has a company_id, keep it
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 1) Try to read company_id from JWT request context (works in Supabase/PG functions)
  BEGIN
    v_claim_company := NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'company_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_claim_company := NULL;
  END;

  -- 2) Apply fallback hierarchy
  NEW.company_id := COALESCE(v_claim_company, :'target_company'::uuid);

  RETURN NEW;
END;
$;


-- ============================================================================
-- 13. FUNCTION: Calcular total de venta automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_sale_total()
RETURNS TRIGGER AS $$
DECLARE
  new_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(subtotal), 0)
  INTO new_total
  FROM sale_items
  WHERE sale_id = NEW.sale_id;

  UPDATE sales 
  SET total = new_total
  WHERE id = NEW.sale_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_sale_total ON sale_items;
CREATE TRIGGER trg_calculate_sale_total
  AFTER INSERT OR UPDATE OR DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sale_total();


-- ============================================================================
-- 14. FUNCTION: Calcular total de compra automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_purchase_total()
RETURNS TRIGGER AS $$
DECLARE
  new_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(subtotal), 0)
  INTO new_total
  FROM purchase_items
  WHERE purchase_id = NEW.purchase_id;

  UPDATE purchases 
  SET total = new_total
  WHERE id = NEW.purchase_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_purchase_total ON purchase_items;
CREATE TRIGGER trg_calculate_purchase_total
  AFTER INSERT OR UPDATE OR DELETE ON purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_purchase_total();


-- ============================================================================
-- 15. FUNCTION: Validar que solo una sesión de caja está abierta
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_single_open_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' THEN
    IF EXISTS (
      SELECT 1 FROM cash_register_sessions
      WHERE cash_register_id = NEW.cash_register_id
        AND status = 'open'
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Ya existe una sesión abierta para esta caja. Cierra la sesión actual primero.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_single_session ON cash_register_sessions;
CREATE TRIGGER trg_validate_single_session
  BEFORE INSERT OR UPDATE ON cash_register_sessions
  FOR EACH ROW
  EXECUTE FUNCTION validate_single_open_session();


-- ============================================================================
-- 16. FUNCTION: Validar NCF duplicado
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_ncf_unique()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ncf IS NOT NULL AND NEW.ncf != '' THEN
    IF EXISTS (
      SELECT 1 FROM invoices 
      WHERE ncf = NEW.ncf 
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'El NCF % ya existe. No se pueden duplicar NCFs.', NEW.ncf;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_ncf ON invoices;
CREATE TRIGGER trg_validate_ncf
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_ncf_unique();


-- ============================================================================
-- 17. FUNCTION: Prevenir eliminación de registros en tablas críticas
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DELETE no permitido en %. Use soft delete (SET deleted_at) en su lugar.', TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas que no deben eliminarse físicamente
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY[
      'sales', 'sale_items', 'invoices', 'purchases', 'purchase_items',
      'inventory_ledger', 'audit_logs', 'cash_register_sessions',
      'payment_transactions', 'accounting_entries'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS prevent_delete ON %I; CREATE TRIGGER prevent_delete BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ============================================================================
-- 18. FUNCTION: Validar que el status de venta sea consistente
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_sale_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Transiciones válidas de estado de venta
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE OLD.status
      WHEN 'pending' THEN
        IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
          RAISE EXCEPTION 'Transición inválida: pending → %', NEW.status;
        END IF;
      WHEN 'confirmed' THEN
        IF NEW.status NOT IN ('processing', 'cancelled') THEN
          RAISE EXCEPTION 'Transición inválida: confirmed → %', NEW.status;
        END IF;
      WHEN 'processing' THEN
        IF NEW.status NOT IN ('shipped', 'completed', 'cancelled') THEN
          RAISE EXCEPTION 'Transición inválida: processing → %', NEW.status;
        END IF;
      WHEN 'shipped' THEN
        IF NEW.status NOT IN ('delivered', 'cancelled') THEN
          RAISE EXCEPTION 'Transición inválida: shipped → %', NEW.status;
        END IF;
      WHEN 'completed' THEN
        RAISE EXCEPTION 'No se puede cambiar el estado de una venta completada';
      WHEN 'cancelled' THEN
        RAISE EXCEPTION 'No se puede cambiar el estado de una venta cancelada';
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_sale_status ON sales;
CREATE TRIGGER trg_validate_sale_status
  BEFORE UPDATE OF status ON sales
  FOR EACH ROW
  EXECUTE FUNCTION validate_sale_status_transition();


-- ============================================================================
-- 19. FUNCTION: Prevenir stock negativo
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.new_balance < 0 THEN
    RAISE EXCEPTION 'Stock negativo no permitido para producto %. Balance actual: %, Movimiento: %',
      NEW.product_id, NEW.previous_balance, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_negative_stock ON inventory_ledger;
CREATE TRIGGER trg_prevent_negative_stock
  BEFORE INSERT ON inventory_ledger
  FOR EACH ROW
  WHEN (NEW.movement_type NOT IN ('OPENING', 'INVENTORY_COUNT', 'RESERVATION'))
  EXECUTE FUNCTION prevent_negative_stock();


-- ============================================================================
-- 20. FUNCTION: Crear cliente automático para compras online
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_client_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando un usuario se registra, crear cliente automáticamente
  IF NOT EXISTS (
    SELECT 1 FROM clients WHERE user_id = NEW.id
  ) THEN
    INSERT INTO clients (
      user_id,
      first_name,
      last_name,
      email,
      phone,
      client_type,
      is_active
    ) VALUES (
      NEW.id,
      COALESCE(NEW.first_name, 'Cliente'),
      COALESCE(NEW.last_name, ''),
      NEW.email,
      COALESCE(NEW.phone, ''),
      'regular',
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_client ON users;
CREATE TRIGGER trg_auto_client
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_for_user();


-- ============================================================================
-- 21. FUNCTION: Auditoría automática (cambios en tablas sensibles)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_sensitive_changes()
RETURNS TRIGGER AS $$
DECLARE
  action TEXT;
  old_data JSONB;
  new_data JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    action := 'DELETE';
    old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    action := 'UPDATE';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    action := 'INSERT';
    new_data := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    performed_by,
    ip_address,
    user_agent
  ) VALUES (
    action,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN (OLD.id)::TEXT
      ELSE (NEW.id)::TEXT
    END,
    old_data,
    new_data,
    auth.user_id(),
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar auditoría a tablas sensibles
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY[
      'users', 'sales', 'invoices', 'purchases', 'inventory',
      'inventory_ledger', 'cash_register_sessions', 'payments'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_log ON %I; CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION log_sensitive_changes();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ============================================================================
-- RESUMEN
-- ============================================================================
-- 21 funciones creadas/actualizadas:
--   1. update_updated_at_column() — genérico
--   2. calculate_ledger_balances() — auto-cálculo saldos
--   3. refresh_inventory_balances() — refresh materialized view
--   4. publish_outbox_event() — publicar eventos
--   5. on_sale_created() — evento post-venta
--   6. on_sale_status_changed() — evento cambio estado venta
--   7. on_purchase_created() — evento post-compra
--   8. on_purchase_status_changed() — evento cambio estado compra
--   9. auto_generate_ncf() — NCF automático
--  10. validate_stock_before_sale() — validación stock
--  11. create_inventory_movement_for_sale() — movimiento inventario
--  12. auto_assign_company_id() — auto-asignar empresa
--  13. calculate_sale_total() — recalcular total venta
--  14. calculate_purchase_total() — recalcular total compra
--  15. validate_single_open_session() — sesión única caja
--  16. validate_ncf_unique() — NCF no duplicado
--  17. prevent_hard_delete() — soft delete forzado
--  18. validate_sale_status_transition() — transiciones válidas
--  19. prevent_negative_stock() — stock no negativo
--  20. auto_create_client_for_user() — cliente automático
--  21. log_sensitive_changes() — auditoría automática
--
-- Triggers: ~40+ triggers aplicados a tablas del dominio
-- ============================================================================


COMMIT;

-- ============================================================================
-- ROLLBACK:
-- Para cada trigger: DROP TRIGGER IF EXISTS <name> ON <table>;
-- Para cada función: DROP FUNCTION IF EXISTS <function_name>();
-- ============================================================================
