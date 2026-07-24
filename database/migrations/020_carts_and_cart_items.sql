-- ===================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO Y VENTAS
-- Migración 020: Crear tablas carts y cart_items
-- ===================================================
-- Fecha: 2026-07-16
-- Descripción: Tablas necesarias para el carrito de
-- compras del ecommerce (sale-service)
-- ===================================================

-- 1. CARTS
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CART ITEMS
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  discount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================
-- INDEXES
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- ===================================================
-- UPDATED_AT TRIGGER FOR CARTS
-- ===================================================
CREATE OR REPLACE FUNCTION update_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_carts_updated_at ON carts;
CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_carts_updated_at();

-- ===================================================
-- ROW LEVEL SECURITY
-- ===================================================
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Política: usuarios ven solo su propio carrito
DROP POLICY IF EXISTS "Users manage their own cart" ON carts;
CREATE POLICY "Users manage their own cart" ON carts
  FOR ALL
  USING (user_id = auth.uid());

-- Política: items del carrito visibles para el dueño del carrito
DROP POLICY IF EXISTS "Users manage their own cart items" ON cart_items;
CREATE POLICY "Users manage their own cart items" ON cart_items
  FOR ALL
  USING (
    cart_id IN (
      SELECT id FROM carts WHERE user_id = auth.uid()
    )
  );

-- ===================================================
-- NOTA: El sale-service usa service_role, que bypasses RLS.
-- Las políticas RLS son para consultas directas desde
-- el frontend si se necesitan en el futuro.
-- ===================================================
