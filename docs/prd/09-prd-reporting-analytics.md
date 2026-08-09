# PRD: Reporting & Analytics Bounded Context

## 1. Overview

| Campo | Valor |
|-------|-------|
| **Bounded Context** | Reporting & Analytics |
| **Versión** | 2.0 |
| **Estado** | Propuesta |

## 2. Problem Statement

El `report-service` (3008) calcula métricas en tiempo real desde la base de datos principal, causando carga pesada. Los reportes fiscales DGII no están integrados.

## 3. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Dashboard con KPIs en < 2s | Cache de métricas |
| G2 | Reportes de ventas, inventario, clientes, caja | Cobertura completa |
| G3 | Reportes fiscales DGII 606, 607 | Exportación válida |
| G4 | Exportación PDF, Excel, CSV | Múltiples formatos |
| G5 | Reportes programados (email automático) | Envío periódico |

## 4. API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/reports/dashboard` | KPIs del dashboard | Auth |
| GET | `/api/v1/reports/sales` | Reporte de ventas | Auth |
| GET | `/api/v1/reports/sales/top-products` | Top productos | Auth |
| GET | `/api/v1/reports/inventory` | Reporte de inventario | Auth |
| GET | `/api/v1/reports/clients` | Reporte de clientes | Auth |
| GET | `/api/v1/reports/cash-register` | Reporte de caja | Auth |
| GET | `/api/v1/reports/purchases` | Reporte de compras | Auth |
| GET | `/api/v1/reports/profitability` | Rentabilidad | Admin |
| GET | `/api/v1/reports/dgii/607` | DGII 607 (ventas) | Admin |
| GET | `/api/v1/reports/dgii/606` | DGII 606 (compras) | Admin |
| GET | `/api/v1/reports/export/:type` | Exportar PDF/Excel | Auth |

## 5. Dashboard KPIs

| KPI | Cálculo | Período |
|-----|---------|---------|
| Ventas del día | SUM(total) WHERE date = today | Diario |
| Ventas del mes | SUM(total) WHERE month = current | Mensual |
| Ticket promedio | Ventas / #transacciones | Diario |
| Productos más vendidos | Top 10 por quantity | Semanal |
| Stock bajo | COUNT WHERE stock < min_stock | Actual |
| Clientes activos | COUNT WHERE last_purchase > 30d | Mensual |
| Margen bruto | (Ventas - Costo) / Ventas | Mensual |
| Caja disponible | balance FROM cash_register_sessions | Actual |

## 6. Data Model

```sql
-- report_cache (NUEVA - caché de métricas)
CREATE TABLE report_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  params JSONB,
  result JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  company_id UUID
);
-- scheduled_reports (NUEVA)
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  params JSONB,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  recipients TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  company_id UUID
);
```

## 7. Business Rules

1. **Caché TTL 5min** para reportes del dashboard
2. **Reportes pesados** se ejecutan en background job
3. **Exportación** genera archivo y retorna URL temporal
4. **DGII reports** solo del período fiscal actual
5. **Permisos**: employee ve sus ventas, admin ve todo
