# PHASE 8 — WEBHOOKS / INTEGRATIONS / CMS / FORMS SECURITY (P2)

> Documento de ingeniería 09 · Estado: ⬜ PENDIENTE

## 1. Estado actual

- ✅ `webhooks` + `webhook_logs` + `automation_rules/actions/logs` (046, 056 fix uuid).
- ✅ fn_fire_webhooks(uuid,...) + fn_trigger_automations + fn_register_webhook_event.
- ✅ Outbox → RabbitMQ → subscribers.
- ⚠️ Sin firma de webhook saliente (X-Signature), sin retries con backoff, sin dead letters.
- ⚠️ Sin validación SSRF de URLs de destino.
- ⚠️ `custom_code_blocks` acepta HTML/JS (XSS potencial) — mitigar con sanitización/privilegio.

## 2. Plan

### 2.1 SSRF protection (P2, alto valor)
- Helper `isPrivateHost(url)` en integration-service: bloquea localhost, 127.0.0.1, 0.0.0.0, 10/8, 172.16/12, 192.168/16, 169.254.169.254, *.internal, metadata.
- Validar en: creación/edición de webhook, URLs de integraciones, site builder (fetch de templates), CMS (links).
- Resolver DNS y verificar IP resultante (doble chequeo).

### 2.2 Firma y replay protection (P2)
- Al disparar webhook: `X-Signature: HMAC-SHA256(secret, timestamp + "." + payload)` + `X-Timestamp` + `X-Event-Id`.
- Al recibir (callbacks de pago): verificar firma + timestamp (±5min) + dedup por event_id.

### 2.3 Retries con backoff + dead letter (P2)
- Columnas en `webhook_logs` (o tabla nueva): attempt, max_attempts (5), next_retry_at, last_error, status.
- Backoff: 1m, 5m, 15m, 30m, 1h.
- `webhook_dead_letters` para fallos permanentes (tabla nueva en migración 061) + endpoints retry/inspect/discard.

### 2.4 CMS security (P2)
- Sanitizar HTML (allowlist de tags/attrs) en cms_sections/custom_code_blocks o exigir modo privilegiado.
- Validar URLs de iframes/links (bloquear javascript:, data:).
- `cms_page_versions` ya existe → versionado OK (draft/preview/published/archived).

### 2.5 Form security (P2)
- Rate limiting por IP en submissions públicas (ya hay tenant limiter → añadir por form).
- Honeypot field + payload size limit + validación server-side estricta (ya Zod) + detección de duplicados.

### 2.6 Tests
- `scripts/test-security/webhook-security.mjs`: replay attack bloqueado, firma inválida rechazada, SSRF (localhost rechazado), retry y dead-letter funcionan.
- Extender `run-security-suite.mjs`.

## 3. Criterios de aceptación

```text
- webhook a localhost/192.168.x.x = rechazado en creación y en dispatch
- replay de evento duplicado = no-op
- retries con backoff y dead letter verificados
- forms públicos con rate limit + honeypot
- 54/54 E2E PASS
```
