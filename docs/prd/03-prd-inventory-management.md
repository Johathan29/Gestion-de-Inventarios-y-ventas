# PRD: Inventory Management Bounded Context

## 1. Overview

| Campo | Valor |
|-------|-------|
| **Bounded Context** | Inventory Management |
| **Versión** | 2.0 |
| **Estado** | Propuesta |

## 2. Problem Statement

El sistema actual maneja inventario en **múltiples tablas inconsistentes**:
- `inventory` — stock por producto+warehouse
- `inventory_movements` — movimientos sin saldo calculado
- `stock_adjustments` — ajustes sin integración al ledger
- No hay trail de auditoría completo para movimientos

El **Inventory Ledger** (migración 028) resuelve esto como fuente de verdad.

## 3. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Inventory Ledger como fuente de verdad | Todo stock se calcula desde ledger |
| G2 | Multi-warehouse con stock por ubicación | Stock visible por bodega |
| G3 | Lotes y series para trazabilidad | Soporte para lotes y seriales |
| G4 | Reservar stock para órdenes pendientes | Stock reservado = físico - reservado |
| G5 | Ajustes con aprobación y auditoría | Ajustes requieren justificación |

## 4. User Stories

### US-1: Ver Stock por Producto
**Como** employee,
**Quiero** ver el stock actual de un producto en todas las bodegas,
**Para** saber disponibilidad.

**Criterios de aceptación:**
- [ ] Stock por warehouse
- [ ] Stock total (suma)
- [ ] Stock disponible = stock físico - reservado
- [ ] Último movimiento mostrado

### US-2: Registrar Entrada de Inventario
**Como** warehouse_operator,
**Quiero** registrar entradas por compra, ajuste o devolución,
**Para** mantener el inventario actualizado.

**Criterios de aceptación:**
- [ ] Entrada crea registro en inventory_ledger
- [ ] movement_type correcto (PURCHASE_RECEIPT, ADJUSTMENT_POSITIVE, RETURN)
- [ ] stock actualizado automáticamente
- [ ] Referencia al documento fuente (compra, ajuste, etc.)

### US-3: Ajuste de Inventario
**Como** admin,
**Quiero** realizar ajustes de inventario con justificación,
**Para** corregir discrepancias.

**Criterios de aceptación:**
- [ ] Requiere justificación obligatoria
- [ ] Requiere aprobación de admin
- [ ] Crea movimiento ADJUSTMENT_POSITIVE o ADJUSTMENT_NEGATIVE
- [ ] Audit trail completo

### US-4: Transferencia entre Bodegas
**Como** admin,
**Quiero** transferir stock entre bodegas,
**Para** reabastecer puntos de venta.

**Criterios de aceptación:**
- [ ] Crea 2 movimientos: TRANSFER_OUT (origen) + TRANSFER_IN (destino)
- [ ] Atomicidad: ambas transacciones exitosas o ninguna
- [ ] Referencia compartida (transfer_id)

### US-5: Inventario Físico
**Como** admin,
**Quiero** realizar conteos físicos de inventario,
**Para** validar stock real vs registrado.

**Criterios de aceptación:**
- [ ] Crear sesión de conteo
- [ ] Registrar cantidades contadas por producto
- [ ] Generar ajustes automáticos por diferencias
- [ ] Reporte de discrepancias

### US-6: Lotes y Vencimientos
**Como** warehouse_operator,
**Quiero** manejar lotes con fecha de vencimiento,
**Para** controlar productos perecederos.

**Criterios de aceptación:**
- [ ] Cada entrada puede tener lote asignado
- [ ] Alertas de productos próximos a vencer
- [ ] FIFO automático para productos con lote

## 5. API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/inventory` | Stock consolidado | Auth |
| GET | `/api/v1/inventory/:productId` | Stock por producto | Auth |
| GET | `/api/v1/inventory/ledger` | Ledger completo (paginado) | Auth |
| POST | `/api/v1/inventory/entry` | Registrar entrada | Warehouse |
| POST | `/api/v1/inventory/adjustment` | Ajuste con justificación | Admin |
| POST | `/api/v1/inventory/transfer` | Transferencia inter-bodega | Admin |
| POST | `/api/v1/inventory/physical-count` | Iniciar conteo físico | Admin |
| PUT | `/api/v1/inventory/physical-count/:id` | Actualizar conteo | Warehouse |
| POST | `/api/v1/inventory/reserve` | Reservar stock | Auth |
| DELETE | `/api/v1/inventory/reserve/:id` | Liberar reserva | Auth |
| GET | `/api/v1/warehouses` | Listar bodegas | Auth |
| POST | `/api/v1/warehouses` | Crear bodega | Admin |
| GET | `/api/v1/inventory/lotes` | Listar lotes | Auth |
| GET | `/api/v1/inventory/alerts` | Alertas stock bajo/vencimiento | Auth |

## 6. Domain Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `StockReceived` | entry by purchase | purchase-service (confirmar recepción) |
| `StockAdjusted` | adjustment | audit-service |
| `StockTransferred` | transfer | audit-service |
| `StockReserved` | reservation | sale-service, checkout-service |
| `StockReleased` | reservation cancel | sale-service |
| `LowStockDetected` | after any movement | notification-service (alerta) |
| `ProductExpiring` | cron/check | notification-service |
| `PhysicalCountCompleted` | count finish | audit-service |

## 7. Data Model

```sql
-- inventory (consolidada)
-- inventory_ledger (append-only, MIGRATION 028)
-- inventory_movements (legacy, mantener por compatibilidad)
-- inventory_reservations
-- inventory_lots
-- inventory_serials
-- warehouses
-- warehouse_locations
```

## 8. Business Rules

1. **Stock nunca negativo** → trigger BEFORE INSERT en ledger
2. **Ledger es inmutable** → NO UPDATE/DELETE permitido
3. **Transferencias atómicas** → BEGIN/COMMIT transaccional
4. **Reservar no descuenta stock** → solo reserva lógica
5. **Ajustes requieren justificación** → campo NOT NULL en ajustes
6. **FIFO para lotes** → ordenar por fecha de producción
7. **Alerta stock bajo** → cuando quantity < min_stock en warehouse
