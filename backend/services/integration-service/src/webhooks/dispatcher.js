// ============================================================================
// Webhook Dispatcher — entrega HTTP segura:
//   1. SSRF guard en la URL inicial y en CADA redirect (máx. 5)
//   2. Firma HMAC / headers de auth según configuración
//   3. Timeout configurable, medición de duración
// ============================================================================

import { validateWebhookUrl } from './ssrf.js';
import { buildAuthHeaders } from './signature.js';

const MAX_REDIRECTS = 5;

/**
 * Entrega un webhook a su URL destino con protección SSRF y firma.
 * @param {object} webhook - fila de webhooks (url, timeout_ms, auth_*, custom_headers...)
 * @param {object} payload - payload JSON a enviar
 * @param {object} [opts]
 * @param {string} [opts.eventType] - evento que disparó el envío (header X-Webhook-Event)
 * @returns {Promise<{ok: boolean, status?: number, body?: string, durationMs: number,
 *                    signature?: string, resolvedIp?: string, error?: string}>}
 */
export async function deliverWebhook(webhook, payload, opts = {}) {
  const start = Date.now();
  const body = JSON.stringify(payload);
  const timeoutMs = Number(webhook.timeout_ms) || 10000;

  // ── 1. SSRF: validar la URL inicial ──────────────────────────────────────
  const initial = await validateWebhookUrl(webhook.url);
  if (!initial.ok) {
    return {
      ok: false,
      durationMs: Date.now() - start,
      error: initial.error,
      resolvedIp: initial.ip || null,
    };
  }

  const { headers, signature } = buildAuthHeaders(webhook, body);
  headers['Content-Type'] = webhook.content_type || 'application/json';
  if (opts.eventType) headers['X-Webhook-Event'] = opts.eventType;
  headers['User-Agent'] = 'Aurora-ERP-Webhook/1.0';

  const fetch = (await import('node-fetch')).default;

  // ── 2. Entrega con redirects validados uno a uno (anti SSRF rebinding) ──
  let currentUrl = webhook.url;
  let redirects = 0;
  let response = null;
  let responseBody = '';
  let resolvedIp = initial.ip || null;

  try {
    while (true) {
      const check = await validateWebhookUrl(currentUrl);
      if (!check.ok) {
        return {
          ok: false,
          durationMs: Date.now() - start,
          error: check.error,
          resolvedIp: check.ip || resolvedIp,
          signature,
        };
      }
      resolvedIp = check.ip || resolvedIp;

      response = await fetch(currentUrl, {
        method: webhook.http_method || 'POST',
        headers,
        body: ['GET', 'HEAD'].includes((webhook.http_method || 'POST').toUpperCase()) ? undefined : body,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        if (redirects >= MAX_REDIRECTS) {
          return {
            ok: false,
            status: response.status,
            durationMs: Date.now() - start,
            error: `Demasiados redirects (máx ${MAX_REDIRECTS})`,
            resolvedIp,
            signature,
          };
        }
        redirects += 1;
        currentUrl = new URL(response.headers.get('location'), currentUrl).toString();
        continue;
      }

      responseBody = await response.text().catch(() => '');
      break;
    }

    const ok = response.status >= 200 && response.status < 300;
    return {
      ok,
      status: response.status,
      body: responseBody,
      durationMs: Date.now() - start,
      signature,
      resolvedIp,
      error: ok ? null : `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: response?.status || null,
      durationMs: Date.now() - start,
      error: err.name === 'AbortError' ? `Timeout después de ${timeoutMs}ms` : err.message,
      resolvedIp,
      signature,
    };
  }
}
