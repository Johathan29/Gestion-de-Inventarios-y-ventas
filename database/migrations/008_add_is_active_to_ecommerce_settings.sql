-- ============================================================
-- 008: Añadir columna is_active a ecommerce_settings
-- ============================================================

ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Actualizar registros existentes a true
UPDATE ecommerce_settings SET is_active = true WHERE is_active IS NULL;
