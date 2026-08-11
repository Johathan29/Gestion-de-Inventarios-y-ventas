// ============================================================================
// Webhook Worker — procesa webhook_logs pendientes:
//   1. Reclama un lote vía RPC fn_claim_webhook_batch (FOR UPDATE SKIP LOCKED)
//   2. Entrega con SSRF guard + firma HMAC (dispatcher)
//   3. Retries con backoff exponencial: next_retry_at = now + delay * 2^(attempt-1)
//   4. Actualiza webhook_logs + contadores de webhooks (success/error)
// ============================================================================

import { deliverWebhook } from './dispatcher.js';

const DEFAULT_INTERVAL_MS = 4000;
const DEFAULT_BATCH = 20;
const BACKOFF_CAP_MS = 10 * 60 * 1000; // 10 minutos máx entre reintentos

// Fase 9 — contador de fallos definitivos (exposición en /health)
let webhookFailureCount = 0;

export function getWebhookFailureCount() {
  return webhookFailureCount;
}

/**
 * Procesa UN ciclo completo del worker. Devuelve resumen.
 */
export async function runWebhookCycle(supabase, { batch = DEFAULT_BATCH } = {}) {
  // 1. Reclamar lote
  const { data: claimed, error } = await supabase.rpc('fn_claim_webhook_batch', { p_limit: batch });
  if (error) {
    console.error('[WEBHOOK-WORKER] Error reclamando lote:', error.message);
    return { error: error.message, processed: 0 };
  }
  if (!claimed || claimed.length === 0) return { processed: 0, results: [] };

  const results = [];
  for (const log of claimed) {
    results.push(await processLog(supabase, log));
  }

  const success = results.filter((r) => r.finalStatus === 'success').length;
  const errorCount = results.filter((r) => r.finalStatus === 'error').length;
  const retrying = results.filter((r) => r.finalStatus === 'retrying').length;
  console.log(`[WEBHOOK-WORKER] ciclo: ${results.length} logs (${success} ok, ${retrying} retry, ${errorCount} error)`);
  return { processed: results.length, success, retrying, error: errorCount, results };
}

/**
 * Procesa un log individual: carga el webhook, entrega, aplica retry/backoff.
 */
async function processLog(supabase, log) {
  const { data: webhook, error: whErr } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', log.webhook_id)
    .maybeSingle();

  if (whErr || !webhook) {
    // Webhook eliminado → marcar log como error definitivo
    webhookFailureCount += 1;
    await supabase.from('webhook_logs').update({
      status: 'error',
      error_message: 'Webhook no encontrado',
      completed_at: new Date().toISOString(),
    }).eq('id', log.id);
    return { logId: log.id, finalStatus: 'error' };
  }

  const attempt = (log.attempt || 1);
  const maxAttempts = (log.max_attempts || webhook.retry_count || 3);

  // ── Entrega (SSRF + firma) ─────────────────────────────────────────────
  const delivery = await deliverWebhook(webhook, log.payload, { eventType: log.event_type });
  const now = new Date().toISOString();

  // ── Actualizar el log ──────────────────────────────────────────────────
  const baseUpdate = {
    attempt,
    status: 'success',
    response_status: delivery.status ?? null,
    response_body: delivery.body ? delivery.body.substring(0, 5000) : null,
    error_message: delivery.error || null,
    request_signature: delivery.signature || null,
    resolved_ip: delivery.resolvedIp || null,
    duration_ms: Math.round(delivery.durationMs),
    completed_at: now,
    next_retry_at: null,
  };

  // ── Actualizar contadores del webhook ──────────────────────────────────
  if (delivery.ok) {
    baseUpdate.status = 'success';
    await supabase.from('webhooks').update({
      last_status: 'success',
      last_triggered_at: now,
      last_error: null,
      success_count: (webhook.success_count || 0) + 1,
      error_count: webhook.error_count || 0,
    }).eq('id', webhook.id);
    await supabase.from('webhook_logs').update(baseUpdate).eq('id', log.id);
    return { logId: log.id, finalStatus: 'success', attempt };
  }

  // ── Fallo: ¿reintentar con backoff exponencial? ────────────────────────
  if (attempt < maxAttempts) {
    const baseDelay = Number(webhook.retry_delay_ms) || 5000;
    const backoff = Math.min(baseDelay * Math.pow(2, attempt - 1), BACKOFF_CAP_MS);
    const nextRetryAt = new Date(Date.now() + backoff).toISOString();

    await supabase.from('webhooks').update({
      last_status: 'error',
      last_triggered_at: now,
      last_error: delivery.error?.substring(0, 500) || 'Delivery failed',
      error_count: (webhook.error_count || 0) + 1,
    }).eq('id', webhook.id);

    await supabase.from('webhook_logs').update({
      ...baseUpdate,
      status: 'retrying',
      attempt: attempt + 1,
      next_retry_at: nextRetryAt,
      completed_at: null,
    }).eq('id', log.id);

    return { logId: log.id, finalStatus: 'retrying', attempt: attempt + 1, nextRetryAt };
  }

  // ── Agotado el número de intentos → error definitivo ───────────────────
  webhookFailureCount += 1;
  await supabase.from('webhooks').update({
    last_status: 'error',
    last_triggered_at: now,
    last_error: delivery.error?.substring(0, 500) || 'Delivery failed',
    error_count: (webhook.error_count || 0) + 1,
  }).eq('id', webhook.id);

  await supabase.from('webhook_logs').update({
    ...baseUpdate,
    status: 'error',
    next_retry_at: null,
  }).eq('id', log.id);

  return { logId: log.id, finalStatus: 'error', attempt };
}

/**
 * Arranca el worker en bucle (setInterval). No bloquea el proceso.
 */
export function startWebhookWorker(supabase, { intervalMs = DEFAULT_INTERVAL_MS, batch = DEFAULT_BATCH } = {}) {
  const run = () => runWebhookCycle(supabase, { batch }).catch((err) => {
    console.error('[WEBHOOK-WORKER] Ciclo fallido:', err.message);
  });

  run(); // primer ciclo inmediato
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  console.log(`[WEBHOOK-WORKER] Iniciado (intervalo ${intervalMs}ms, batch ${batch})`);
  return timer;
}
