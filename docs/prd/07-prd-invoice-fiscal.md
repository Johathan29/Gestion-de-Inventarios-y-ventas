# PRD: Invoice & Fiscal Domain Bounded Context

## 1. Overview

| Campo | Valor |
|-------|-------|
| **Bounded Context** | Invoice & Fiscal |
| **Versión** | 2.0 |
| **Estado** | Propuesta |

## 2. Problem Statement

El sistema dominicano requiere NCF (Números de Comprobante Fiscal) para facturación válida. Las tablas de facturación están fragmentadas entre `invoices` y `sales`, sin un sistema robusto de secuencias fiscales.

## 3. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | NCF válido y secuencial | Sin duplicados ni saltos |
| G2 | Notas de crédito y débito | Soporte completo DGII |
| G3 | Reportes fiscales 606, 607 | Exportación DGII format |
| G4 | Multi-documento | Crédito fiscal, consumo, Gubernamental |

## 4. API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/invoices` | Crear factura | Employee |
| GET | `/api/v1/invoices` | Listar facturas | Auth |
| GET | `/api/v1/invoices/:id` | Detalle factura | Auth |
| GET | `/api/v1/invoices/:id/pdf` | Generar PDF | Auth |
| POST | `/api/v1/invoices/:id/void` | Anular factura | Admin |
| POST | `/api/v1/credit-notes` | Crear nota de crédito | Admin |
| POST | `/api/v1/debit-notes` | Crear nota de débito | Admin |
| GET | `/api/v1/ncf/sequences` | Ver secuencias NCF | Admin |
| POST | `/api/v1/ncf/sequences` | Crear secuencia | Admin |
| GET | `/api/v1/reports/dgii/606` | Reporte 606 (compras) | Admin |
| GET | `/api/v1/reports/dgii/607` | Reporte 607 (ventas) | Admin |

## 5. Data Model

```sql
-- fiscal_document_types (catálogo de tipos)
-- ncf_sequences (secuencias por tipo y empresa)
-- invoices (facturas con NCF)
-- credit_notes + credit_note_items
-- debit_notes + debit_note_items
```

## 6. NCF Types (República Dominicana)

| Tipo | Código | Uso |
|------|--------|-----|
| Crédito Fiscal | 01 | Empresas contribuyentes |
| Consumo | 02 | Consumo final |
| Gubernamental | 04 | Entes gubernamentales |
| Nota de Crédito | 03 | Devoluciones/descuentos |
| Nota de Débito | 04 | Ajustes al alza |
| Régimen Especial | 14 | Regímenes especiales |

## 7. Business Rules

1. **NCF secuencial** → trigger auto_generate_ncf (MIGRATION 030)
2. **NCF único** → trigger validate_ncf_unique (MIGRATION 030)
3. **No se puede anular** factura con NCF ya reportado a DGII
4. **Nota de crédito** referencia factura original
5. **Reportes DGII** se generan por período mensual
