# PHASE 5 — IDEMPOTENCY (P1)

> Documento de ingeniería 06 · Estado: ⬜ PENDIENTE
> Objetivo: dos requests con la misma `Idempotency-Key` producen UNA sola operación.

## 1. Estado actual

- ✅ `payment_transactions.idempotency_key` (055) + índice único parcial.
- ✅ `transactional_outbox` con correlation_id (049/055) → publicaciones idempotentes por diseño.
- ✅ sp_create_sale: transacción única por llamada.
- ⚠️ Checkout NO es idempotente a nivel HTTP (doble POST = doble venta).

## 2. Brechas

| # | Brecha |
|---|---|
| 5.1 | `idempotency_keys` table NO existe |
| 5.2 | checkout sin soporte Idempotency-Key |
| 5.3 | webhook processing sin deduplicación por event_id |
| 5.4 | invoice creation puede duplicarse si el request se repite |

## 3. Plan

### 3.1 Migración 061: `idempotency_keys`
```sql
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  endpoint TEXT NOT NULL,
  request_hash TEXT,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours'
);
CREATE UNIQUE INDEX uq_idempotency_company_key ON idempotency_keys(company_id, key);
```

### 3.2 Middleware `idempotent` en shared-kernel
- Lee `Idempotency-Key` header + `req.method`/`req.path` + hash del body.
- Si existe y no expiró → devuelve respuesta cacheada (mismo status/body).
- Si no existe → ejecuta handler y guarda resultado.
- OJO: solo para POST/PUT en endpoints de efectos (checkout, payment, sale, invoice, webhook callbacks).

### 3.3 Aplicar en rutas
- `POST /api/v1/sales/checkout` (sale-service)
- `POST /api/v1/payments/*/charge` o equivalente
- `POST /api/v1/invoices` (si existe create manual)
- Webhook ingest de payment-service (dedup por event_id)

### 3.4 `scripts/test-idempotency/run-idempotency-suite.mjs`
- I01 duplicate checkout (misma key → 1 venta, 2ª respuesta idéntica)
- I02 duplicate payment callback
- I03 duplicate webhook delivery
- I04 duplicate sale creation
- I05 duplicate invoice creation
- I06 duplicate CRM conversion (lead → 1 cliente)

## 4. Criterios de aceptación

```text
- mismo Idempotency-Key + mismo body → 1 sola operación de negocio
- 54/54 E2E PASS
```

## 5. Riesgos
- Medio: cachear respuestas de pago puede devolver 200 cuando la 1ª fue fallo → guardar status real.
- Medio: TTL demasiado corto rompe retries lentos → 24h por defecto.
