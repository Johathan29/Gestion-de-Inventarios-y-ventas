-- ============================================================
-- HOTFIX 003: company_id en invoices (rompe autoCreateInvoice)
-- ============================================================
-- Causa raíz (verificada 2026-08-04 vía diagnóstico directo):
--   El trigger trg_auto_ncf → auto_generate_ncf() consulta
--   ncf_sequences usando NEW.company_id, pero la tabla invoices
--   NUNCA recibió la columna company_id (la 014 solo cubrió
--   users/warehouses/products/audit_logs y el hotfix_002 cubrió
--   clients/sales/dynamic_form_submissions).
--   → cualquier INSERT en invoices lanza:
--       record "new" has no field "company_id"  → 500 P0001
--   → sale-service autoCreateInvoice falla silenciosamente
--     (return null) → las ventas nunca quedan vinculadas a su
--     factura (sales.invoice_id NULL) → T17/T18 en rojo.
--   → también rompe el trigger trg_invoice_update_sale_invoice_id
--     (fn_update_sale_invoice_id) si hiciera UPDATE de sales? No:
--     ese trigger funciona, pero el INSERT previo muere en el
--     BEFORE INSERT de trg_auto_ncf.
--
-- SOLUCIÓN (idempotente, mismo patrón que hotfix_002):
--   • Agregar company_id UUID NULL a invoices → auto_generate_ncf
--     pasa NEW.company_id = NULL y su WHERE (company_id IS NULL
--     OR company_id = NEW.company_id) matchea secuencias sin
--     company → NCF se asigna si hay secuencia activa; si no,
--     simplemente queda NULL (no bloquea la factura).
--   • NOTIFY pgrst 'reload schema' para limpiar el schema cache.
-- ============================================================

BEGIN;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
