-- Fix 062: quitar auto_assign de sale_items (el trigger inteligente manda)
DROP TRIGGER IF EXISTS trg_auto_company_id ON sale_items;

-- Verificar
SELECT tg.tgname, p.proname
FROM pg_trigger tg
JOIN pg_proc p ON p.oid = tg.tgfoid
JOIN pg_class c ON c.oid = tg.tgrelid
WHERE c.relname = 'sale_items' AND NOT tg.tgisinternal;
