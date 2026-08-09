-- ============================================================================
-- MIGRATION 057: HOTFIX PLATAFORMA — service_role = platform_admin + categorías
-- ============================================================================
-- 1) get_current_user_role(): mapear el rol 'service_role' (service role key)
--    a 'platform_admin'. Así las RPC de plataforma (get_platform_stats,
--    get_all_companies, get_company_details, create_support_session, etc.)
--    funcionan cuando platform-admin-service e integration-service usan la
--    service role key (los JWTs de negocio no son válidos para PostgREST).
-- 2) Permisos `categories` para el rol admin: faltaba la clave en el JSONB
--    de permisos, por lo que POST /api/v1/categories devolvía 403
--    (category:create no estaba concedido).

-- ─── 1. get_current_user_role con mapeo service_role → platform_admin ─────
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN COALESCE(NULLIF(current_setting('request.jwt.claims', true)::json->>'role', ''), 'customer')
         IN ('service_role', 'platform_admin')
    THEN 'platform_admin'
    ELSE COALESCE(NULLIF(current_setting('request.jwt.claims', true)::json->>'role', ''), 'customer')
  END;
$$;

-- ─── 2. Permisos de categorías para el rol admin (id=1) ───────────────────
UPDATE public.roles
SET permissions = permissions || '{"categories": ["create", "read", "update", "delete"]}'::jsonb
WHERE id = 1 AND NOT (permissions ? 'categories');
