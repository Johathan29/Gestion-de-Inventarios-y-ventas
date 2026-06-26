-- ===================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO Y VENTAS
-- Migración 007: Auto-crear registro en clients desde users
--   - Trigger: al insertar un user con role 'cliente'
--   - También sincroniza datos si el user actualiza su perfil
--   - Agrega tabla para cuentas de crédito de clientes
--   - Agrega tabla para preferencias de notificación
-- ===================================================

-- ============================================================
-- 1. FUNCIÓN: Crear cliente automáticamente al registrar usuario
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

-- Trigger después de insertar usuario
DROP TRIGGER IF EXISTS trg_auto_create_client ON users;
CREATE TRIGGER trg_auto_create_client
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client();

-- ============================================================
-- 2. FUNCIÓN: Sincronizar cliente cuando se actualiza el usuario
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

DROP TRIGGER IF EXISTS trg_sync_client_from_user ON users;
CREATE TRIGGER trg_sync_client_from_user
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_client_from_user();

-- ============================================================
-- 3. TABLA: Cuentas de crédito para clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS client_credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL, -- Encriptado a nivel de aplicación
  account_type VARCHAR(50) DEFAULT 'credito',
  credit_limit DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- ============================================================
-- 4. TABLA: Preferencias de notificación del cliente
-- ============================================================
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

-- Insertar preferencias por defecto cuando se crea un cliente
CREATE OR REPLACE FUNCTION auto_create_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_notification_preferences (client_id)
  VALUES (NEW.id)
  ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_notification_prefs ON clients;
CREATE TRIGGER trg_auto_notification_prefs
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_notification_prefs();

-- ============================================================
-- 5. POLÍTICAS RLS
-- ============================================================
ALTER TABLE client_credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas: el cliente solo ve sus propios datos
DROP POLICY IF EXISTS "Clientes ven su propia cuenta de crédito" ON client_credit_accounts;
CREATE POLICY "Clientes ven su propia cuenta de crédito" ON client_credit_accounts
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Clientes ven sus preferencias" ON client_notification_preferences;
CREATE POLICY "Clientes ven sus preferencias" ON client_notification_preferences
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Admin puede ver todo
DROP POLICY IF EXISTS "Admin ALL credit accounts" ON client_credit_accounts;
CREATE POLICY "Admin ALL credit accounts" ON client_credit_accounts
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin'))
  );

DROP POLICY IF EXISTS "Admin ALL notification prefs" ON client_notification_preferences;
CREATE POLICY "Admin ALL notification prefs" ON client_notification_preferences
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin'))
  );

-- ============================================================
-- 6. TABLA: Historial de compras del cliente (vista materializada)
--    También crear índice para paginación rápida
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_cart_client_id ON cart(client_id);
