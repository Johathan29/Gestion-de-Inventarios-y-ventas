-- ============================================================================
-- MIGRATION 071: WEBHOOKS SEGURIDAD — worker, retries con backoff, firma HMAC
-- ============================================================================
-- Fase 8 del hardening:
--   1. Índice del worker (pending/retrying → next_retry_at)
--   2. Columnas de auditoría: request_signature (firma HMAC enviada),
--      resolved_ip (IP resuelta en el SSRF check) y started_at (claim del worker)
--   3. RPC fn_claim_webhook_batch con FOR UPDATE SKIP LOCKED:
--      reclama lotes de logs SIN doble envío entre réplicas del worker.
-- ============================================================================

-- ─── 1. ÍNDICE DEL WORKER ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_webhook_logs_worker
  ON webhook_logs(status, next_retry_at)
  WHERE status IN ('pending', 'retrying', 'sending');

-- ─── 2. COLUMNAS DE AUDITORÍA ─────────────────────────────────────────────
ALTER TABLE webhook_logs
  ADD COLUMN IF NOT EXISTS request_signature TEXT,
  ADD COLUMN IF NOT EXISTS resolved_ip      TEXT,
  ADD COLUMN IF NOT EXISTS started_at       TIMESTAMPTZ;

COMMENT ON COLUMN webhook_logs.request_signature IS 'Firma HMAC-SHA256 enviada en X-Webhook-Signature (auditoría de integridad)';
COMMENT ON COLUMN webhook_logs.resolved_ip IS 'IP verificada por el SSRF guard (bloquea rangos privados/reservados)';
COMMENT ON COLUMN webhook_logs.started_at IS 'Marca del claim del worker (recuperación de crashes)';

-- ─── 3. RPC: RECLAMAR LOTE DE WEBHOOKS PENDIENTES ─────────────────────────
-- Reclama filas pending/retrying (o sending huérfanas con started_at viejo),
-- las marca 'sending' y las devuelve. FOR UPDATE SKIP LOCKED evita que dos
-- instancias del worker entreguen el mismo webhook.
CREATE OR REPLACE FUNCTION public.fn_claim_webhook_batch(
  p_limit INTEGER DEFAULT 20,
  p_stale_after_seconds INTEGER DEFAULT 120
) RETURNS SETOF webhook_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row webhook_logs;
BEGIN
  FOR v_row IN
    SELECT * FROM webhook_logs
    WHERE status IN ('pending', 'retrying')
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       OR (status = 'sending'
           AND started_at IS NOT NULL
           AND started_at < NOW() - (p_stale_after_seconds || ' seconds')::INTERVAL)
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE webhook_logs
       SET status = 'sending', started_at = NOW()
     WHERE id = v_row.id;
    RETURN NEXT v_row;
  END LOOP;
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.fn_claim_webhook_batch IS
  'Reclama un lote de webhook_logs pendientes para el worker (FOR UPDATE SKIP LOCKED, sin doble entrega)';

-- ============================================================================
-- 4. Punto final: el dispatcher entrega el webhook y actualiza:
--    - webhook_logs → success | retrying | error (con attempt, next_retry_at,
--      response_status, response_body, request_signature, resolved_ip, duration_ms)
--    - webhooks → last_status, success_count, error_count, last_error
-- La lógica de entrega (SSRF + firma HMAC + backoff) vive en el worker Node:
--   backend/services/integration-service/src/webhooks/*.js
-- ============================================================================
