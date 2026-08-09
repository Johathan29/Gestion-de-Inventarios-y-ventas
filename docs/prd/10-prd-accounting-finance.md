# PRD: Accounting & Finance Bounded Context

## 1. Overview

| Campo | Valor |
|-------|-------|
| **Bounded Context** | Accounting & Finance |
| **Versión** | 2.0 |
| **Estado** | Propuesta |

## 2. Problem Statement

El sistema no tiene contabilidad integrada. Las ventas y compras no generan asientos contables automáticamente. No hay balance general ni estado de resultados.

## 3. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Asientos contables automáticos | Cada venta/compra genera asiento |
| G2 | Plan de cuentas configurables | Cuentas por empresa |
| G3 | Balance general y estado de resultados | Reportes contables |
| G4 | Conciliación bancaria | Matching automático |

## 4. API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/accounting/entries` | Listar asientos | Auth |
| POST | `/api/v1/accounting/entries` | Crear asiento manual | Admin |
| GET | `/api/v1/accounting/chart` | Plan de cuentas | Auth |
| POST | `/api/v1/accounting/chart` | Crear cuenta | Admin |
| GET | `/api/v1/accounting/trial-balance` | Balance de comprobación | Admin |
| GET | `/api/v1/accounting/balance-sheet` | Balance general | Admin |
| GET | `/api/v1/accounting/income-statement` | Estado de resultados | Admin |
| POST | `/api/v1/accounting/journal-entry` | Asiento manual | Admin |

## 5. Auto-Accounting Rules

| Event | Debito | Credito |
|-------|--------|---------|
| Venta al contado | Caja/Banco | Ventas + ITBIS por pagar |
| Venta a crédito | Cuentas por cobrar | Ventas + ITBIS por pagar |
| Compra al contado | Inventario/Gasto | Caja/Banco |
| Compra a crédito | Inventario/Gasto | Cuentas por pagar |
| Pago de cliente | Caja/Banco | Cuentas por cobrar |
| Pago a proveedor | Cuentas por pagar | Caja/Banco |
| Devolución de venta | Ventas + ITBIS | Cuentas por cobrar/Caja |
| Ajuste de inventario | Inventario (+) / Gasto (-) | Ajuste de inventario |

## 6. Data Model

```sql
-- account_plans (plan de cuentas)
-- accounting_entries (asientos contables)
-- accounting_entry_items (partidas del asiento)
-- accounting_periods (períodos contables)
-- accounting_journals (diarios)
-- bank_accounts
-- bank_transactions
```

## 7. Business Rules

1. **Partida doble** → suma(debito) = suma(credito) siempre
2. **Período cerrado** no permite asientos
3. **Asientos automáticos** se generan desde eventos
4. **No se puede eliminar** asiento con período cerrado
5. **Audit trail** en cada asiento
