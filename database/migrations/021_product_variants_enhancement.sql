-- ===================================================
-- MIGRATION 021: Product Variants Enhancement
-- Mejora la tabla product_variants con campos adicionales
-- y crea funciones auxiliares para el módulo de variantes
-- ===================================================

-- 1. Asegurar columnas adicionales en product_variants
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS compare_price DECIMAL(12,2) CHECK (compare_price >= 0);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_is_active ON product_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_product_variants_attributes ON product_variants USING gin(attributes);

-- 3. Función RPC para obtener variantes de un producto con datos básicos
CREATE OR REPLACE FUNCTION get_product_variants(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pv.id,
        'name', pv.name,
        'sku', pv.sku,
        'price', pv.price,
        'compare_price', pv.compare_price,
        'stock', pv.stock,
        'attributes', pv.attributes,
        'images', pv.images,
        'is_active', pv.is_active,
        'sort_order', pv.sort_order
      ) ORDER BY pv.sort_order, pv.name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM product_variants pv
  WHERE pv.product_id = p_product_id
    AND pv.is_active = true;

  RETURN v_result;
END;
$$;

-- 4. Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON product_variants;
CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_updated_at();

-- 5. Trigger: actualizar updated_at del producto padre cuando se modifiquen variantes
CREATE OR REPLACE FUNCTION touch_parent_product_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products SET updated_at = NOW() WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_product_variants_touch_product ON product_variants;
CREATE TRIGGER trg_product_variants_touch_product
  AFTER INSERT OR UPDATE OR DELETE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION touch_parent_product_updated_at();
