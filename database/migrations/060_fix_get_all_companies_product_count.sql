-- ============================================================
-- Migración 060: Fix get_all_companies — products NO tiene company_id
-- El RPC referenciaba `products p WHERE p.company_id = c.id` (42703).
-- El multi-tenant de products se resuelve vía created_by → users.company_id.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_all_companies(p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_total INTEGER; v_companies JSONB;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Only platform admins'; END IF;
  SELECT COUNT(*) INTO v_total FROM companies c
  WHERE (p_search IS NULL OR c.name ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR c.subscription_status = p_status);
  SELECT jsonb_agg(row_to_json(c_data)) INTO v_companies FROM (
    SELECT c.id, c.name, c.slug, c.logo_url, c.is_active, c.subscription_status, c.created_at,
           c.business_type_id, bt.name as business_type_name,
           (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) as user_count,
           (SELECT COUNT(*) FROM clients cl WHERE cl.company_id = c.id) as client_count,
           -- products no tiene company_id: se resuelve vía created_by → users.company_id
           (SELECT COUNT(*) FROM products p JOIN users pu ON pu.id = p.created_by WHERE pu.company_id = c.id) as product_count,
           sp.name as plan_name
    FROM companies c
    LEFT JOIN business_types bt ON bt.id = c.business_type_id
    LEFT JOIN company_subscriptions cs ON cs.company_id = c.id AND cs.status = 'active'
    LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
    WHERE (p_search IS NULL OR c.name ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR c.subscription_status = p_status)
    ORDER BY c.created_at DESC LIMIT p_limit OFFSET p_offset
  ) c_data;
  RETURN jsonb_build_object('companies', COALESCE(v_companies, '[]'::jsonb), 'total', v_total);
END; $function$;
