-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 067 — IDEMPOTENCIA (Fase 5)
-- 1. Tabla idempotency_keys (genérica, por tenant) + claim RPC atómico
-- 2. Dedup de webhook_logs por event_id (evita doble entrega del mismo evento)
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. TABLA idempotency_keys ─────────────────────────────────────────
-- Clave idempotente por (company_id, key): misma clave + mismo body =
-- una sola operación; respuestas cacheadas para replay seguro.
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL,                    -- Idempotency-Key del cliente
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         UUID,                             -- usuario que emitió la petición
  method          TEXT NOT NULL DEFAULT 'POST',
  path            TEXT NOT NULL DEFAULT '',
  request_hash    TEXT NOT NULL,                    -- hash método+path+body
  response_status INTEGER,                          -- NULL = en proceso
  response_body   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + INTERVAL '24 hours')
);

COMMENT ON TABLE public.idempotency_keys IS
  'Replay de peticiones idempotentes: misma clave = misma operación (TTL 24h)';

-- Una clave por (empresa, key) — la unicidad es la que hace atómico el claim
CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_company_key
  ON public.idempotency_keys (company_id, key);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires
  ON public.idempotency_keys (expires_at);

-- RLS: los repos usan el client tenant-aware (service role), que filtra por
-- company_id. Se habilitan políticas básicas por si algún día se usa el anon key.
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS idempotency_select_own ON public.idempotency_keys;
CREATE POLICY idempotency_select_own ON public.idempotency_keys
  FOR SELECT USING (company_id = auth.uid()::uuid OR company_id IS NOT NULL);

DROP POLICY IF EXISTS idempotency_insert_own ON public.idempotency_keys;
CREATE POLICY idempotency_insert_own ON public.idempotency_keys
  FOR INSERT WITH CHECK (company_id IS NOT NULL);

DROP POLICY IF EXISTS idempotency_update_own ON public.idempotency_keys;
CREATE POLICY idempotency_update_own ON public.idempotency_keys
  FOR UPDATE USING (company_id IS NOT NULL);

DROP POLICY IF EXISTS idempotency_delete_own ON public.idempotency_keys;
CREATE POLICY idempotency_delete_own ON public.idempotency_keys
  FOR DELETE USING (company_id IS NOT NULL);

-- ─── 2. RPC: CLAIM ATÓMICO ─────────────────────────────────────────────
-- Intenta insertar (key, company); si ya existe devuelve la fila existente.
-- Dos peticiones concurrentes con la misma clave: solo una inserta; la otra
-- lee la fila (is_new = false). El índice único hace la exclusión mutua.
CREATE OR REPLACE FUNCTION public.fn_idempotency_claim(
  p_key            TEXT,
  p_company_id     UUID,
  p_user_id        UUID DEFAULT NULL,
  p_method         TEXT DEFAULT 'POST',
  p_path           TEXT DEFAULT '',
  p_request_hash   TEXT DEFAULT '',
  p_ttl_hours      INTEGER DEFAULT 24
) RETURNS jsonb AS $$
DECLARE
  v_row idempotency_keys%ROWTYPE;
  v_expires TIMESTAMPTZ;
BEGIN
  -- Limpieza best-effort de claves vencidas de esta empresa (barata, sin lock)
  DELETE FROM public.idempotency_keys
  WHERE company_id = p_company_id AND expires_at < clock_timestamp();

  v_expires := clock_timestamp() + make_interval(hours => p_ttl_hours);

  INSERT INTO public.idempotency_keys
    (key, company_id, user_id, method, path, request_hash, expires_at)
  VALUES
    (p_key, p_company_id, p_user_id, p_method, p_path, p_request_hash, v_expires)
  ON CONFLICT (company_id, key) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    -- La clave ya existía: leer la fila (la respuesta cacheada o "en proceso")
    SELECT * INTO v_row
    FROM public.idempotency_keys
    WHERE company_id = p_company_id AND key = p_key;

    IF v_row.id IS NULL THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CLAIM_FAILED: race condition reinserting key';
    END IF;

    RETURN jsonb_build_object(
      'id', v_row.id,
      'is_new', false,
      'request_hash', v_row.request_hash,
      'response_status', v_row.response_status,
      'response_body', v_row.response_body,
      'expires_at', v_row.expires_at
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'is_new', true,
    'request_hash', v_row.request_hash,
    'response_status', v_row.response_status,
    'response_body', v_row.response_body,
    'expires_at', v_row.expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── 3. RPC: COMPLETAR RESPUESTA ────────────────────────────────────────
-- Guarda el resultado de una petición idempotente tras ejecutarse.
CREATE OR REPLACE FUNCTION public.fn_idempotency_complete(
  p_id      UUID,
  p_status  INTEGER,
  p_body    JSONB
) RETURNS void AS $$
BEGIN
  UPDATE public.idempotency_keys
  SET response_status = p_status,
      response_body   = p_body
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── 4. RPC: DESCARTAR CLAVE (fallo 5xx → reintento limpio) ────────────
CREATE OR REPLACE FUNCTION public.fn_idempotency_release(
  p_id UUID
) RETURNS void AS $$
BEGIN
  DELETE FROM public.idempotency_keys WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── 5. DEDUP DE WEBHOOKS POR event_id ──────────────────────────────────
-- event_id = hash determinístico del payload → dos disparos del MISMO evento
-- lógico (mismo payload) no generan dos entregas pendientes.
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS event_id UUID;

COMMENT ON COLUMN public.webhook_logs.event_id IS
  'Hash determinístico del payload: deduplica disparos duplicados del mismo evento';

CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_logs_webhook_event
  ON public.webhook_logs (webhook_id, event_id)
  WHERE event_id IS NOT NULL;

-- ─── 6. fn_fire_webhooks: INSERT idempotente ────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_fire_webhooks(
  p_company_id  UUID,
  p_event       VARCHAR(50),
  p_payload     JSONB
) RETURNS void AS $$
DECLARE
  v_webhook RECORD;
  v_event_id UUID;
BEGIN
  -- ID determinístico: mismo payload + mismo evento = mismo event_id
  v_event_id := md5(p_event || ':' || COALESCE(p_payload::text, ''))::uuid;

  FOR v_webhook IN
    SELECT * FROM webhooks
    WHERE company_id = p_company_id
      AND is_active = TRUE
      AND p_event = ANY(events)
  LOOP
    INSERT INTO webhook_logs (webhook_id, company_id, event_type, payload, status, max_attempts, event_id)
    VALUES (v_webhook.id, p_company_id, p_event, p_payload, 'pending', v_webhook.retry_count, v_event_id)
    ON CONFLICT (webhook_id, event_id) WHERE event_id IS NOT NULL DO NOTHING;

    -- Solo actualizar last_triggered_at si realmente se encoló
    IF FOUND THEN
      UPDATE webhooks SET last_triggered_at = NOW() WHERE id = v_webhook.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── 7. GRANTS ──────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.fn_idempotency_claim(TEXT, UUID, UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_idempotency_complete(UUID, INTEGER, JSONB) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_idempotency_release(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_fire_webhooks(UUID, VARCHAR, JSONB) TO authenticated, service_role;
GRANT ALL ON public.idempotency_keys TO authenticated, service_role;
