-- ============================================================
-- Fase 9 — Observabilidad + Audit (migración 072)
--  1. audit_logs: request_id + trace_id
--  2. Inmutabilidad de auditoría: bloquea UPDATE/DELETE
--  3. Índices para trazabilidad
-- ============================================================

-- ────────────────────────────────────────────────────────────────
-- 1. Columnas de trazabilidad en audit_logs
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS request_id UUID,
  ADD COLUMN IF NOT EXISTS trace_id  UUID;

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON public.audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_trace_id  ON public.audit_logs(trace_id);

-- ────────────────────────────────────────────────────────────────
-- 2. Inmutabilidad del audit trail
--    La auditoría es solo-INSERT: cualquier UPDATE/DELETE se
--    rechaza incluso con service_role (defensa en profundidad,
--    además de las políticas RLS existentes).
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_audit_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs es inmutable: solo se permite INSERT (tabla %)', TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_immutable();

-- ────────────────────────────────────────────────────────────────
-- 3. Función de retención (única vía permitida para purgar audit)
--    SECURITY DEFINER: permite limpiar logs viejos sin romper
--    la inmutabilidad (la usan tareas de mantenimiento).
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_purge_audit_logs(p_days INTEGER DEFAULT 365)
RETURNS BIGINT AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - make_interval(days => p_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
