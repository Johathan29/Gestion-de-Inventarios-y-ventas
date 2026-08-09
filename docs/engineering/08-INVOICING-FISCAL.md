# PHASE 7 — INVOICING FISCAL + CRM IDEMPOTENCY (P1)

> Documento de ingeniería 08 · Estado: ⬜ PENDIENTE

## 1. Estado actual — INVOICING

- ✅ `invoices` con NCF, client fiscal data, seller_name, is_electronic.
- ✅ Auto-creación de factura en venta (POS y ecommerce) con `invoice_id` link en sales.
- ✅ PDF (invoice-service) + mark-as-paid.
- ⚠️ **`invoice_items` NO EXISTE**: los items se leen dinámicamente de `sale_items`. Si el producto cambia (nombre/precio/impuesto), la factura histórica cambia → riesgo fiscal.

## 2. Plan — FISCAL SNAPSHOT (P1)

### 2.1 Migración 061: crear `invoice_items` con snapshot
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES sale_items(id),
  product_id UUID,
  description TEXT NOT NULL,        -- snapshot nombre
  sku VARCHAR(100),                 -- snapshot SKU
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL, -- snapshot precio
  discount NUMERIC(14,2) DEFAULT 0,
  tax NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_company_id ON invoice_items(company_id);
-- RLS igual a invoices
```

### 2.2 Backfill + switch
- Backfill: INSERT INTO invoice_items SELECT ... FROM invoices JOIN sale_items.
- Cambiar invoice-service para leer de `invoice_items` (fallback a sale_items mientras migra).
- PDF usa snapshot.

### 2.3 Test fiscal
- Emitir factura → cambiar producto (precio/nombre) → regenerar PDF → el PDF conserva los datos ORIGINALES.

## 3. CRM IDEMPOTENCY (P1, anexo)

- Estado: `crm_leads` con `converted_at` (044).
- Tarea: `convertLead` debe ser idempotente: si `converted_at != null` → no crear otro cliente (devolver el existente).
- Test: convertir el mismo lead 2 veces → 1 cliente.

## 4. Criterios de aceptación

```text
- invoice_items creada + backfill completo
- PDF de factura histórica inmutable ante cambios de producto
- conversión de lead repetida = 1 cliente
- 54/54 E2E PASS
```
