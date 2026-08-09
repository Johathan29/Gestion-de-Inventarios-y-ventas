-- 058: is_platform_admin debe reconocer service_role (PostgREST con service key)
-- Motivo: get_platform_stats/get_all_companies/get_company_details etc. validan con
-- is_platform_admin(), que usa auth.uid() (NULL cuando se llama con la service key).
-- La service key es la llave maestra del proyecto (nunca se expone al cliente),
-- por lo que mapear service_role -> plataforma admin es seguro.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
    OR COALESCE(NULLIF(current_setting('request.jwt.claims', true)::json->>'role', ''), '')
       IN ('service_role', 'platform_admin');
$function$;
