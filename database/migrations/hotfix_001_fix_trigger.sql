-- ===================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO Y VENTAS
-- Hotfix 001: Arreglar trigger function auto_create_client
-- 
-- Error: "control reached end of trigger procedure without RETURN"
-- Causa: Las funciones trigger sync_user_to_client_insert() y
--        sync_user_to_client() fueron creadas con cuerpo vacío
--        (BEGIN END; sin RETURN NEW;) en la BD
-- 
-- CÓMO USAR:
--   1. Ir a https://supabase.com/dashboard/project/prspnfxfspokbqxsboby/sql/new
--   2. Copiar y pegar TODO este script
--   3. Hacer clic en "RUN" o "Execute"
-- ===================================================

-- ============================================================
-- 1. CREAR TABLAS FALTANTES (Migración 008 no ejecutada)
-- ============================================================

-- Tabla: Cuentas de crédito para clientes
CREATE TABLE IF NOT EXISTS client_credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  account_type VARCHAR(50) DEFAULT 'credito',
  credit_limit DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- Tabla: Preferencias de notificación del cliente
CREATE TABLE IF NOT EXISTS client_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  whatsapp_notifications BOOLEAN DEFAULT false,
  purchase_confirmation_email BOOLEAN DEFAULT true,
  purchase_confirmation_whatsapp BOOLEAN DEFAULT false,
  shipping_updates_email BOOLEAN DEFAULT true,
  shipping_updates_whatsapp BOOLEAN DEFAULT false,
  promo_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- RLS Policies
ALTER TABLE client_credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clientes ven su propia cuenta de crédito" ON client_credit_accounts;
CREATE POLICY "Clientes ven su propia cuenta de crédito" ON client_credit_accounts
  FOR ALL USING (auth.uid() IN (
    SELECT c.user_id FROM clients c WHERE c.id = client_credit_accounts.client_id
  ));

DROP POLICY IF EXISTS "Clientes ven sus preferencias de notificación" ON client_notification_preferences;
CREATE POLICY "Clientes ven sus preferencias de notificación" ON client_notification_preferences
  FOR ALL USING (auth.uid() IN (
    SELECT c.user_id FROM clients c WHERE c.id = client_notification_preferences.client_id
  ));

DROP POLICY IF EXISTS "Admin full access credit accounts" ON client_credit_accounts;
CREATE POLICY "Admin full access credit accounts" ON client_credit_accounts
  FOR ALL USING (auth.uid() IN (
    SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin'
  ));

DROP POLICY IF EXISTS "Admin full access notification prefs" ON client_notification_preferences;
CREATE POLICY "Admin full access notification prefs" ON client_notification_preferences
  FOR ALL USING (auth.uid() IN (
    SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin'
  ));

-- ============================================================
-- 2. ELIMINAR TRIGGERS EXISTENTES (nombres REALES en la BD)
-- ============================================================
DROP TRIGGER IF EXISTS trg_users_create_client ON users;
DROP TRIGGER IF EXISTS trg_users_update_client ON users;
DROP TRIGGER IF EXISTS trg_auto_create_client ON users;
DROP TRIGGER IF EXISTS trg_sync_client_from_user ON users;
DROP TRIGGER IF EXISTS trg_auto_notification_prefs ON clients;

-- ============================================================
-- 3. ELIMINAR FUNCIONES EXISTENTES (nombres REALES en la BD)
-- ============================================================
DROP FUNCTION IF EXISTS sync_user_to_client_insert();
DROP FUNCTION IF EXISTS sync_user_to_client();
DROP FUNCTION IF EXISTS auto_create_client();
DROP FUNCTION IF EXISTS sync_client_from_user();
DROP FUNCTION IF EXISTS auto_create_notification_prefs();

-- ============================================================
-- 4. AGREGAR UNIQUE(user_id) EN clients (necesario para ON CONFLICT)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'clients'::regclass 
    AND conname = 'clients_user_id_key'
  ) THEN
    ALTER TABLE clients ADD UNIQUE(user_id);
    RAISE NOTICE 'Unique constraint added to clients(user_id)';
  ELSE
    RAISE NOTICE 'Unique constraint already exists on clients(user_id)';
  END IF;
END $$;

-- ============================================================
-- 5. RECREAR FUNCIÓN: auto_create_client()
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_client()
RETURNS TRIGGER AS $$
DECLARE
  client_role_id INTEGER;
BEGIN
  -- Obtener el role_id para 'cliente'
  SELECT id INTO client_role_id FROM roles WHERE name = 'cliente' LIMIT 1;

  -- Solo crear cliente si el rol es 'cliente'
  IF NEW.role_id = client_role_id THEN
    INSERT INTO clients (user_id, name, email, phone, is_active, created_at, updated_at)
    VALUES (NEW.id, NEW.name, NEW.email, NEW.phone, true, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. RECREAR TRIGGER: trg_auto_create_client
-- ============================================================
CREATE TRIGGER trg_auto_create_client
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client();

-- ============================================================
-- 7. RECREAR FUNCIÓN: sync_client_from_user()
-- ============================================================
CREATE OR REPLACE FUNCTION sync_client_from_user()
RETURNS TRIGGER AS $$
DECLARE
  client_role_id INTEGER;
BEGIN
  SELECT id INTO client_role_id FROM roles WHERE name = 'cliente' LIMIT 1;

  IF NEW.role_id = client_role_id THEN
    INSERT INTO clients (user_id, name, email, phone, is_active, updated_at)
    VALUES (NEW.id, NEW.name, NEW.email, NEW.phone, true, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. RECREAR TRIGGER: trg_sync_client_from_user
-- ============================================================
CREATE TRIGGER trg_sync_client_from_user
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_client_from_user();

-- ============================================================
-- 9. RECREAR FUNCIÓN: auto_create_notification_prefs()
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_notification_preferences (client_id)
  VALUES (NEW.id)
  ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. RECREAR TRIGGER: trg_auto_notification_prefs
-- ============================================================
CREATE TRIGGER trg_auto_notification_prefs
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_notification_prefs();

-- ============================================================
-- 11. VERIFICAR QUE TODO ESTÉ CORRECTO
-- ============================================================
DO $$
DECLARE
  trigger_count INTEGER;
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count FROM pg_trigger 
  WHERE tgrelid = 'users'::regclass AND tgname IN ('trg_auto_create_client', 'trg_sync_client_from_user');
  
  SELECT COUNT(*) INTO func_count FROM pg_proc 
  WHERE proname IN ('auto_create_client', 'sync_client_from_user', 'auto_create_notification_prefs');
  
  RAISE NOTICE 'Triggers recreados: %', trigger_count;
  RAISE NOTICE 'Funciones recreadas: %', func_count;
  
  IF trigger_count >= 2 AND func_count >= 3 THEN
    RAISE NOTICE '✅ TODO CORRECTO - Los triggers y funciones están funcionando';
  ELSE
    RAISE WARNING '⚠️ ALGO FALLÓ - Verificar los pasos anteriores';
  END IF;
END $$;

-- ============================================================
-- 12. TEST: Insertar usuario de prueba para verificar
-- ============================================================
DO $$
DECLARE
  test_user_id UUID;
  test_client_id UUID;
BEGIN
  -- Insertar usuario de prueba con role_id = 5 (cliente)
  INSERT INTO users (name, email, password_hash, role_id, is_active)
  VALUES (
    'Test Fix User',
    'testfix_' || floor(random() * 1000000)::text || '@verify.com',
    '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5GzYq0Ht6Fq1xJ8n0Qd5Kqy',
    5,
    true
  )
  RETURNING id INTO test_user_id;

  RAISE NOTICE 'Usuario de prueba creado: %', test_user_id;

  -- Esperar un momento para que el trigger se ejecute
  PERFORM pg_sleep(0.1);

  -- Verificar que se creó el cliente automáticamente
  SELECT id INTO test_client_id FROM clients WHERE user_id = test_user_id;
  
  IF test_client_id IS NOT NULL THEN
    RAISE NOTICE '✅ Cliente creado automáticamente: %', test_client_id;
  ELSE
    RAISE WARNING '⚠️ No se creó el cliente automáticamente';
  END IF;

  -- Limpiar datos de prueba
  DELETE FROM users WHERE id = test_user_id;
  RAISE NOTICE 'Datos de prueba eliminados';
END $$;
