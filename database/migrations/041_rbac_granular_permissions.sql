-- ============================================================================
-- MIGRATION 041: RBAC GRANULAR PERMISSIONS SYSTEM
-- ============================================================================
-- Implementa sistema completo de permisos granulares tipo resource.action
-- Complementa el sistema de roles existente con control fino de acceso
-- ============================================================================

-- ─── 1. TABLA DE PERMISOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(100) NOT NULL,       -- e.g. 'sales.create'
  resource      VARCHAR(50) NOT NULL,        -- e.g. 'sales'
  action        VARCHAR(30) NOT NULL,        -- e.g. 'create'
  name          VARCHAR(150) NOT NULL,       -- Display name: 'Crear ventas'
  description   TEXT,
  category      VARCHAR(50) NOT NULL,        -- Grouping: 'Ventas', 'Inventario', 'CMS'
  is_system     BOOLEAN NOT NULL DEFAULT FALSE, -- System permissions can't be deleted
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(code),
  UNIQUE(resource, action)
);

CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_code ON permissions(code);

COMMENT ON TABLE permissions IS 'Permisos granulares del sistema RBAC - resource.action';

-- ─── 2. JUNCIÓN ROLES-PERMISOS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id              SERIAL PRIMARY KEY,
  role_id         INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id   INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted         BOOLEAN NOT NULL DEFAULT TRUE,   -- Permite revocar sin eliminar
  granted_by      UUID REFERENCES users(id),
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,                      -- Permisos temporales
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

COMMENT ON TABLE role_permissions IS 'Asignación de permisos a roles (RBAC)';

-- ─── 3. PERMISOS DE USUARIO DIRECTOS (override del rol) ───────────────────
CREATE TABLE IF NOT EXISTS user_permissions (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id   INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted         BOOLEAN NOT NULL DEFAULT TRUE,   -- false = revocado explícitamente
  granted_by      UUID REFERENCES users(id),
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  reason          TEXT,                             -- Por qué se otorga/revoca
  UNIQUE(user_id, permission_id)
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON user_permissions(permission_id);

COMMENT ON TABLE user_permissions IS 'Permisos directos a usuario que override el rol (grant/revoke)';

-- ─── 4. FUNCIÓN: Verificar si un usuario tiene un permiso ─────────────────
CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id UUID,
  p_permission_code VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_role_perm BOOLEAN := FALSE;
  v_has_user_perm BOOLEAN := FALSE;
  v_user_granted  BOOLEAN;
  v_role_granted  BOOLEAN;
  v_role_expires  TIMESTAMPTZ;
  v_user_expires  TIMESTAMPTZ;
  v_user_override BOOLEAN := NULL;
BEGIN
  -- 1. Verificar si hay un override directo de usuario
  SELECT up.granted, up.expires_at
  INTO v_user_override, v_user_expires
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = p_user_id
    AND p.code = p_permission_code;

  -- Si existe override de usuario y no ha expirado
  IF v_user_override IS NOT NULL THEN
    IF v_user_expires IS NULL OR v_user_expires > NOW() THEN
      RETURN v_user_override;
    END IF;
    -- Si expiró, continuar verificando rol
  END IF;

  -- 2. Verificar permisos del rol
  SELECT rp.granted INTO v_role_granted
  FROM role_permissions rp
  JOIN permissions p ON p.id = rp.permission_id
  JOIN users u ON u.role_id = rp.role_id
  WHERE u.id = p_user_id
    AND p.code = p_permission_code;

  IF v_role_granted IS NOT NULL THEN
    RETURN v_role_granted;
  END IF;

  -- 3. Verificar permisos legacy (JSONB en roles.permissions)
  SELECT (r.permissions ? p_permission_code) INTO v_has_role_perm
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = p_user_id;

  RETURN COALESCE(v_has_role_perm, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.check_user_permission IS 'Verifica si un usuario tiene un permiso específico (RBAC granular + override directo)';

-- ─── 5. FUNCIÓN: Obtener todos los permisos de un usuario ──────────────────
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE(
  permission_code VARCHAR(100),
  permission_name VARCHAR(150),
  resource        VARCHAR(50),
  action         VARCHAR(30),
  source          TEXT    -- 'role', 'direct', 'legacy'
) AS $$
BEGIN
  RETURN QUERY
  WITH role_perms AS (
    SELECT DISTINCT
      p.code AS permission_code,
      p.name AS permission_name,
      p.resource,
      p.action,
      'role' AS source
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN users u ON u.role_id = rp.role_id
    WHERE u.id = p_user_id
      AND rp.granted = TRUE
      AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
  ),
  direct_perms AS (
    SELECT DISTINCT
      p.code AS permission_code,
      p.name AS permission_name,
      p.resource,
      p.action,
      'direct' AS source
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id
      AND up.granted = TRUE
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
  )
  SELECT * FROM role_perms
  UNION
  SELECT * FROM direct_perms;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.get_user_permissions IS 'Retorna todos los permisos efectivos de un usuario (rol + directos)';

-- ─── 6. FUNCIÓN: Obtener permisos de un rol ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role_id INTEGER)
RETURNS TABLE(
  permission_code VARCHAR(100),
  permission_name VARCHAR(150),
  resource        VARCHAR(50),
  action         VARCHAR(30),
  granted        BOOLEAN,
  category       VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.code AS permission_code,
    p.name AS permission_name,
    p.resource,
    p.action,
    rp.granted,
    p.category
  FROM role_permissions rp
  JOIN permissions p ON p.id = rp.permission_id
  WHERE rp.role_id = p_role_id
  ORDER BY p.category, p.resource, p.action;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- ─── 7. FUNCIÓN: Asignar permiso a rol ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_role_permission(
  p_role_id       INTEGER,
  p_permission_code VARCHAR(100),
  p_granted_by    UUID DEFAULT NULL,
  p_expires_at    TIMESTAMPTZ DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_perm_id INTEGER;
BEGIN
  SELECT id INTO v_perm_id FROM permissions WHERE code = p_permission_code;
  IF v_perm_id IS NULL THEN
    RAISE EXCEPTION 'Permiso no encontrado: %', p_permission_code;
  END IF;

  INSERT INTO role_permissions (role_id, permission_id, granted, granted_by, expires_at)
  VALUES (p_role_id, v_perm_id, TRUE, p_granted_by, p_expires_at)
  ON CONFLICT (role_id, permission_id)
  DO UPDATE SET
    granted = TRUE,
    granted_by = p_granted_by,
    granted_at = NOW(),
    expires_at = p_expires_at;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── 8. FUNCIÓN: Revocar permiso de rol ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_role_permission(
  p_role_id         INTEGER,
  p_permission_code VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  v_perm_id INTEGER;
BEGIN
  SELECT id INTO v_perm_id FROM permissions WHERE code = p_permission_code;
  IF v_perm_id IS NULL THEN RETURN FALSE; END IF;

  UPDATE role_permissions
  SET granted = FALSE
  WHERE role_id = p_role_id AND permission_id = v_perm_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── 9. MIDDLEWARE: Integración Express ────────────────────────────────────
-- Este script se ejecuta como referencia; el middleware real va en backend/shared/middleware/permissions.js
-- Uso en controllers: await requirePermission(req, 'sales.create')

-- ─── 10. TRIGGER: Auto-update updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

-- ─── 11. TABLA: Audit de cambios de permisos ──────────────────────────────
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id              SERIAL PRIMARY KEY,
  actor_id        UUID REFERENCES users(id),
  action          VARCHAR(30) NOT NULL,        -- 'grant_role', 'revoke_role', 'grant_user', 'revoke_user'
  target_type     VARCHAR(20) NOT NULL,        -- 'role' or 'user'
  target_id       INTEGER OR UUID NOT NULL,    -- role_id or user_id
  permission_code VARCHAR(100) NOT NULL,
  granted         BOOLEAN NOT NULL,
  reason          TEXT,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perm_audit_actor ON permission_audit_log(actor_id);
CREATE INDEX idx_perm_audit_target ON permission_audit_log(target_type, target_id);
CREATE INDEX idx_perm_audit_created ON permission_audit_log(created_at);

COMMENT ON TABLE permission_audit_log IS 'Auditoría de cambios de permisos - quién otorgó/revocó qué';

-- ─── 12. PERMISOS LEGACY: Migrar JSONB existente a tabla ──────────────────
-- Función para migrar permisos JSONB del rol a la tabla role_permissions
CREATE OR REPLACE FUNCTION public.migrate_role_jsonb_permissions()
RETURNS void AS $$
DECLARE
  r RECORD;
  perm TEXT;
  perm_id INTEGER;
BEGIN
  FOR r IN SELECT id, permissions FROM roles WHERE permissions IS NOT NULL AND permissions != '{}'::jsonb
  LOOP
    FOR perm IN SELECT jsonb_array_elements_text(r.permissions)
    LOOP
      SELECT id INTO perm_id FROM permissions WHERE code = perm;
      IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted)
        VALUES (r.id, perm_id, TRUE)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar migración de datos existentes
SELECT public.migrate_role_jsonb_permissions();

-- ─── 13. VISTA: Resumen de permisos por rol ───────────────────────────────
CREATE OR REPLACE VIEW vw_role_permissions_summary AS
SELECT
  r.id AS role_id,
  r.name AS role_name,
  r.role_type,
  COUNT(rp.id) FILTER (WHERE rp.granted = TRUE) AS total_permissions,
  COUNT(DISTINCT p.category) AS categories_count,
  ARRAY_AGG(DISTINCT p.category ORDER BY p.category) FILTER (WHERE rp.granted = TRUE) AS permission_categories
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
GROUP BY r.id, r.name, r.role_type;

COMMENT ON VIEW vw_role_permissions_summary IS 'Resumen de permisos por rol con conteo y categorías';
