# PRD: Procurement & Purchases Bounded Context

## 1. Overview

| Campo | Valor |
|-------|-------|
| **Bounded Context** | Procurement & Purchases |
| **Versión** | 2.0 |
| **Estado** | Propuesta |

## 2. Problem Statement

Servicios duplicados: `purchase-service` (3006) y `procurement-service` (3006). Compras, recepción de mercancía e inspección de calidad deben unificarse.

## 3. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Unificar purchase + procurement | Servicio único |
| G2 | Flujo completo: cotización → orden → recepción → inspección →入库 | Pipeline end-to-end |
| G3 | Integración con inventory ledger | Entrada automática al recibir |
| G4 | Multi-moneda | Soporte para USD, DOP, EUR |

## 4. User Stories

### US-1: Crear Orden de Compra
**Como** employee,
**Quiero** crear órdenes de compra a proveedores,
**Para** reabastecer inventario.

**Criterios de aceptación:**
- [ ] Seleccionar proveedor
- [ ] Agregar items con cantidad y precio unitario
- [ ] Subtotal, impuestos, total calculados backend
- [ ] Estado inicial: draft
- [ ] PDF de la orden

### US-2: Recibir Mercancía
**Como** warehouse_operator,
**Quiero** registrar la recepción de mercancía,
**Para** actualizar el inventario.

**Criterios de aceptación:**
- [ ] Recepción vinculada a orden de compra
- [ ] Cantidad recibida vs ordenada
- [ ] Crear entrada en inventory_ledger automática
- [ ] Generar goods_receipt con items

### US-3: Inspección de Calidad
**Como** warehouse_operator,
**Quiero** inspeccionar mercancía recibida,
**Para** aceptar, rechazar o poner en cuarentena.

**Criterios de aceptación:**
- [ ] Cada item se inspecciona individualmente
- [ ] Estados: pending, approved, rejected, quarantine
- [ ] Rechazados generan nota de crédito al proveedor

### US-4: Historial de Compras
**Como** admin,
**Quiero** ver historial de compras por proveedor y período,
**Para** analizar gastos.

**Criterios de aceptación:**
- [ ] Filtros: fecha, proveedor, estado
- [ ] Total gastado por período
- [ ] Top proveedores
- [ ] Exportación

## 5. API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/purchases` | Crear orden | Employee |
| GET | `/api/v1/purchases` | Listar (paginado) | Auth |
| GET | `/api/v1/purchases/:id` | Detalle | Auth |
| PATCH | `/api/v1/purchases/:id/status` | Cambiar estado | Admin |
| POST | `/api/v1/purchases/:id/receive` | Recibir mercancía | Warehouse |
| POST | `/api/v1/purchases/:id/inspect` | Inspeccionar | Warehouse |
| GET | `/api/v1/suppliers` | Listar proveedores | Auth |
| POST | `/api/v1/suppliers` | Crear proveedor | Admin |

## 6. State Machine: Purchase

```
┌───────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐
│ draft │ → │ submitted │ → │ confirmed│ → │ received │ → │ completed │
└───┬───┘    └─────┬─────┘    └────┬─────┘    └────┬─────┘    └───────────┘
    │              │               │               │
    ▼              ▼               ▼               ▼
┌────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│cancelled│   │ rejected │    │ partial  │    │inspected │
└────────┘    └──────────┘    └──────────┘    └──────────┘
```

## 7. Data Model

```sql
-- suppliers
-- purchases
-- purchase_items
-- goods_receipts + goods_receipt_items
-- quality_inspections + quality_inspection_items
-- purchase_payments
```

## 8. Business Rules

1. **Recepción parcial permitida** → marca como 'partial'
2. **Inspección obligatoria** antes de入库
3. **Rechazo total** genera nota de crédito automática
4. **Precio de compra** se guarda en el ledger como unit_cost
5. **Multi-moneda**: se almacena tipo de cambio al momento de la compra
