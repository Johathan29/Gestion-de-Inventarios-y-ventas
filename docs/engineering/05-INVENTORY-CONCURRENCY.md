# PHASE 4 — INVENTORY CONCURRENCY + RESERVATIONS (P1)

> Documento de ingeniería 05 · Estado: ⬜ PENDIENTE
> Objetivo: nunca stock < 0, nunca overselling, nunca doble reversión, incluso con N checkouts simultáneos.

## 1. Estado actual

- ✅ `inventory` es la fuente única de stock.
- ✅ Triggers: `decrease_stock_from_sale()` / `revert_stock_on_sale_cancel()` (variante-aware, 024/025).
- ✅ `inventory_reservations` existe (026) con FOR UPDATE.
- ✅ `inventory_ledger` append-only + FIFO layers (028).
- ✅ sp_create_sale atómico (049): valida stock dentro de la transacción, rollback si falta.
- ⚠️ Memoria: "DB Cancel Trigger Not Firing" → la reversión la hace la aplicación (`updateInventoryStock(isRestore=true)`). RIESGO de doble reversión si el trigger empieza a funcionar.

## 2. Brechas

| # | Brecha |
|---|---|
| 4.1 | No hay test de carrera: stock=1, 10 checkouts simultáneos → 1 éxito, 9 rechazados |
| 4.2 | Doble propietario de reversión: trigger (roto) + aplicación (activa) → definir propietario ÚNICO |
| 4.3 | Reservas no integradas en checkout (cart→reserve→payment→confirm→release) |
| 4.4 | Sin TTL/expiración de reservas |

## 3. Plan

### 3.1 `scripts/test-concurrency/inventory-concurrency.mjs`
- Escenario: producto con stock=1 (crear producto + entrada 1 ud).
- Lanzar 10 `POST /sales` (o checkout) simultáneos con Promise.all.
- Esperado: exactamente 1 `201`, 9 rechazados (`INVENTORY_INSUFFICIENT` o similar).
- Verificar stock final = 0 (nunca negativo).
- Reporte: `scripts/test-concurrency/report-inventory-concurrency.json`.

### 3.2 `scripts/test-concurrency/run-concurrency-suite.mjs`
- C01 concurrent checkout (stock=1 → 1 win)
- C02 concurrent inventory adjustment (ajustes simultáneos → sin pérdida de updates)
- C03 concurrent sale cancellation (cancelar 2 veces la misma venta → una reversión, no +2)
- C04 duplicate checkout (misma key → una venta)
- C05 duplicate webhook
- C06 duplicate payment callback
- C07 simultaneous cart updates
- C08 concurrent CRM conversion (lead→cliente 2 veces → 1 cliente)

### 3.3 Propietario único de reversión
- Decidir: activar el trigger de cancelación (fix) y eliminar la reversión de la app, O documentar que la app es la dueña y DROP del trigger.
- Opción recomendada: mantener la app (ya probada en S53) y desactivar el trigger roto → sin riesgo de doble reversión.
- Test: cancel → cancel again → stock +1 solo la primera vez.

### 3.4 Reservas en checkout (P1, fase posterior si el test 4.1 pasa)
- Flujo objetivo: cart → validate stock → reserve (FOR UPDATE) → payment → confirm → sale → release.
- Estado de reservas: pending/reserved/confirmed/released/expired/cancelled + reserved_at/expires_at.

## 4. Criterios de aceptación

```text
- stock=1, 10 checkouts → 1 éxito, 9 rechazados
- stock nunca < 0 (assert en test)
- cancel doble → no-op controlado, sin stock +2
- 54/54 E2E PASS
```

## 5. Riesgos
- Alto: fix del trigger de cancel podría duplicar reversión → test 4.2/4.3 obligatorio antes.
- Medio: race en `SELECT stock` → siempre usar `UPDATE ... WHERE stock >= qty RETURNING` o FOR UPDATE.
