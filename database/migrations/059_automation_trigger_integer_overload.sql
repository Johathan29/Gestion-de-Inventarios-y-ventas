-- 059: Overload INTEGER de fn_trigger_automations
-- La migración 056 cambió la firma a entity_id UUID, pero tablas con PK
-- entera (leads, dynamic_form_submissions) disparan trg_*_automations vía
-- fn_register_webhook_event() pasando NEW.id (integer) → 42883 en el insert.
-- Este overload delega al motor UUID con trigger_entity_id NULL (columna
-- nullable), preservando evento/entidad sin romper los INSERT.

CREATE OR REPLACE FUNCTION public.fn_trigger_automations(
  p_company_id uuid,
  p_event character varying,
  p_entity character varying,
  p_entity_id integer,
  p_entity_data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_trigger_automations(
    p_company_id, p_event, p_entity, NULL::uuid, p_entity_data
  );
END;
$function$;
