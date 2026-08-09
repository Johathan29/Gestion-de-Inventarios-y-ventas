# PRD: Sales & POS Bounded Context

## 1. Overview

| Campo | Valor |
|-------|-------|
| **Bounded Context** | Sales & POS |
| **Versión** | 2.0 |
| **Estado** | Propuesta |

## 2. Problem Statement

El servicio de ventas maneja POS, ventas online y facturación en un solo servicio monolítico. Las ventas requieren integración con:
- Inventario (descuento automático)
- Facturación fiscal (NCF)
- Caja (sesiones de caja)
- Clientes (historial)
- Pagos (múltiples métodos)

## 3. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | POS rápido (< 3s por transacción) | Checkout completo en < 3s |
| G2 | Ventas online con stock reservado | Reserva antes de confirmar |
| G3 | Integración fiscal automática | NCF generado por venta |
| G4 | Múltiples métodos de pago | Split payment soportado |
| G5 | Offline-first para POS | Funciona sin internet, sync después |

## 4. User Stories

### US-1: Venta en POS
**Como** employee,
**Quiero** crear una venta rápida desde el POS,
**Para** atender clientes en el punto de venta.

**Criterios de aceptación:**
- [ ] Agregar productos por barcode scan o búsqueda
- [ ] Cantidades editables
- [ ] Descuento por línea y global
- [ ] Impuestos calculados automáticamente
- [ ] Total en tiempo real
- [ ] Métodos de pago: efectivo, tarjeta, transferencia
- [ ] Vuelto calculado automáticamente
- [ ] Impresión de ticket

### US-2: Venta Online
**Como** cliente,
**Quiero** comprar desde la tienda online,
**Para** recibir productos en mi domicilio.

**Criterios de aceptación:**
- [ ] Carrito persistente
- [ ] Stock verificado al confirmar
- [ ] Reserva de stock durante checkout
- [ ] Pago gateway (tarjeta, PayPal)
- [ ] Confirmación por email/WhatsApp
- [ ] Tracking de estado

### US-3: Sesión de Caja
**Como** employee,
**Quiero** abrir/cerrar mi turno de caja,
**Para** controlar el efectivo del día.

**Criterios de aceptación:**
- [ ] Abrir con monto inicial
- [ ] Solo una sesión abierta por caja
- [ ] Movimientos durante el turno
- [ ] Cierre con conteo físico
- [ ] Diferencia calculada
- [ ] Reporte de turno

### US-4: Nota de Crédito / Devolución
**Como** admin,
**Quiero** emitir notas de crédito y gestionar devoluciones,
**Para** manejar anulaciones y devoluciones.

**Criterios de aceptación:**
- [ ] Nota de crédito vinculada a factura
- [ ] Reversión de stock automática
- [ ] Reembolso parcial o total
- [ ] Aprobación de admin requerida

### US-5: Historial de Ventas
**Como** employee/admin,
**Quiero** ver el historial de ventas con filtros,
**Para** analizar el rendimiento.

**Criterios de aceptación:**
- [ ] Filtros: fecha, cliente, estado, empleado
- [ ] Exportación CSV/Excel
- [ ] Detalle de cada venta con items
- [ ] Paginación eficiente

## 5. API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/sales` | Crear venta | Employee |
| GET | `/api/v1/sales` | Listar ventas (paginado, filtrado) | Auth |
| GET | `/api/v1/sales/:id` | Detalle venta | Auth |
| PATCH | `/api/v1/sales/:id/status` | Cambiar estado | Admin |
| POST | `/api/v1/sales/:id/void` | Anular venta | Admin |
| POST | `/api/v1/sales/:id/credit-note` | Crear nota de crédito | Admin |
| GET | `/api/v1/sales/:id/ticket` | Generar ticket PDF | Auth |
| POST | `/api/v1/cash-register/open` | Abrir caja | Employee |
| POST | `/api/v1/cash-register/close` | Cerrar caja | Employee |
| GET | `/api/v1/cash-register/current` | Sesión actual | Employee |
| POST | `/api/v1/cash-register/movement` | Movimiento de caja | Employee |
| GET | `/api/v1/cash-register/report` | Reporte de turno | Auth |

## 6. State Machine: Sale

```
                 ┌──────────┐
                 │  pending  │
                 └─────┬────┘
                       │ confirmar
                 ┌─────▼────┐
                 │confirmed  │
                 └─────┬────┘
            ┌──────────┼──────────┐
      │ cancelar  │  procesar  │
  ┌───▼───┐  ┌────▼────┐
  │cancelled│ │processing│
  └────────┘  └────┬────┘
              ┌────┼─────┐
        │  shipped │  completed
  ┌─────▼─────┐  ┌────▼────┐
  │  shipped   │  │completed│
  └─────┬────┘  └─────────┘
        │ delivered
  ┌─────▼─────┐
  │ delivered  │
  └──────────┘
```

## 7. Domain Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `SaleCreated` | POST /sales | inventory (reservar), notification (confirmación) |
| `SaleConfirmed` | PATCH status | inventory (descontar stock) |
| `SaleCompleted` | delivery done | accounting (asiento), notification |
| `SaleCancelled` | void | inventory (liberar stock), accounting (reversar) |
| `CashRegisterOpened` | open | audit |
| `CashRegisterClosed` | close | accounting, audit |
| `PaymentReceived` | payment | accounting, notification |

## 8. Data Model

```sql
-- sales (consolidada)
-- sale_items
-- sale_payments
-- cash_registers
-- cash_register_sessions
-- cash_movements
-- returns + return_items
-- credit_notes + credit_note_items
```

## 9. Business Rules

1. **Stock se descuenta al confirmar**, no al crear
2. **Precio se toma del catálogo al momento de la venta** (no se recalcula)
3. **Impuestos calculados backend** (nunca frontend)
4. **Una venta cancelada no se puede reactivar**
5. **Sesión de caja: solo una abierta por usuario**
6. **Anulación requiere motivo** (campo obligatorio)
