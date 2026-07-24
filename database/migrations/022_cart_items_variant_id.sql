-- ===================================================
-- MIGRATION 022: Add variant_id to cart_items
-- ===================================================
-- Adds support for product variants in the shopping cart.
-- Allows customers to select specific variants and tracks
-- the variant price separately from the product base price.
-- ===================================================

ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '{}';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);

-- ===================================================
-- Function to get variant price (returns variant price
-- if set, otherwise the product base price)
-- ===================================================
CREATE OR REPLACE FUNCTION get_cart_item_unit_price(p_item_id UUID)
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_price DECIMAL(12,2);
BEGIN
    SELECT COALESCE(
        pv.price,  -- variant price
        p.price    -- product base price
    ) INTO v_price
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN product_variants pv ON pv.id = ci.variant_id
    WHERE ci.id = p_item_id;
    RETURN v_price;
END;
$$;
