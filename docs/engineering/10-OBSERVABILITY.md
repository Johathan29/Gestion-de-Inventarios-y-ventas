# PHASE 9 — OBSERVABILITY + AUDIT + ERROR STANDARDIZATION (P2)

> Documento de ingeniería 10 · Estado: ⬜ PENDIENTE

## 1. Estado actual

- ✅ `correlationId` middleware (UUID + propagación + duración).
- ✅ `logger.js` estructurado JSON (levels).
- ✅ `healthCheck.js` (16 servicios) + endpoints /health, /health/ready, /health/live en gateway.
- ✅ `apiResponse.js` con ErrorCodes + successResponse/errorResponse/paginatedResponse.
- ✅ Circuit breaker en gateway + rate limiting.
- ✅ audit_logs + audit-service (login/logout/sales/roles…).
- ⚠️ No hay `request_id`/`trace_id` estandarizado (correlationId existe pero sin trazado entre servicios).

## 2. Plan

### 2.1 Error standardization (`docs/api/ERROR-CODES.md`)
- Formato único: `{ success:false, error:{ code, message, details, request_id } }`.
- Catálogo: AUTH_*, TENANT_*, PRODUCT_*, INVENTORY_*, PAYMENT_*, SALE_*, IDEMPOTENCY_*, VALIDATION_*, NOT_FOUND, INTERNAL.
- Verificar que los servicios devuelven este formato (o normalizarlo en gateway).

### 2.2 Request ID + Trace ID
- Gateway: generar `request_id` (uuid) por request; `trace_id` para operaciones distribuidas.
- Propagar headers `x-request-id` / `x-trace-id` en proxies y fetch internos.
- Incluir en logs de todos los servicios (logger ya acepta extra fields).

### 2.3 Structured logging audit
- `grep -rn "console.log\|console.warn" backend/services` → reemplazar críticos por logger.
- NUNCA loggear: passwords, JWT, service_role, secrets de pago.

### 2.4 Health check profundo
- /health/ready debe reportar: database (SELECT 1), redis (ping), rabbitmq (ping), queue depth, latencia, versión.
- Estados: healthy / degraded / unhealthy.

### 2.5 Métricas
- request_count, request_duration, error_count, db_latency, queue_depth, checkout_success/failure, payment_success/failure, webhook_failure.
- Endpoint `GET /metrics` en gateway (formato Prometheus).

### 2.6 Audit log completo
- Eventos mínimos (login, logout, role_changed, sale_created, sale_cancelled, refund, invoice_issued, invoice_voided, inventory_adjusted, customer_deleted, webhook_created, automation_changed, cms_published, theme_changed).
- Audit inmutable: solo INSERT (revocar UPDATE/DELETE para usuarios normales).

## 3. Criterios de aceptación

```text
- toda respuesta de error usa formato estándar con request_id
- logs estructurados con request_id/trace_id/company_id/user_id
- /health/ready reporta dependencias
- 0 secrets en logs (grep audit)
- 54/54 E2E PASS
```
