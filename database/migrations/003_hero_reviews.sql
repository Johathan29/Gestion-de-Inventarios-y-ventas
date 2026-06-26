-- ===================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO Y VENTAS
-- Migración 003: Hero Settings & Product Reviews
-- ===================================================

-- 1. HERO SETTINGS (configuración de la sección hero del landing)
CREATE TABLE IF NOT EXISTS hero_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge VARCHAR(255) DEFAULT 'Elite Animal Companionship',
  title_line1 VARCHAR(255) DEFAULT 'The Luxury',
  title_line2 VARCHAR(255) DEFAULT 'Pet Atelier.',
  title_line2_style VARCHAR(50) DEFAULT 'italic',
  description TEXT DEFAULT 'We treat the bond between humans and pets as a high-art form. Explore our curated selection of rare companions and bespoke wellness rituals.',
  button1_text VARCHAR(100) DEFAULT 'Explore Collection',
  button1_url VARCHAR(500) DEFAULT '#products',
  button2_text VARCHAR(100) DEFAULT 'Our Story',
  button2_url VARCHAR(500) DEFAULT '#story',
  image_main_url TEXT DEFAULT 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
  image_top_url TEXT DEFAULT 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
  image_bottom_url TEXT DEFAULT 'https://images.unsplash.com/photo-1553882809-a4f57e595701?w=400',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solo una fila activa a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_hero_settings_active ON hero_settings(is_active) WHERE is_active = true;

-- 2. PRODUCT REVIEWS (comentarios con valoración de estrellas)
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_title VARCHAR(255) DEFAULT '',
  client_avatar_url TEXT DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) DEFAULT '',
  comment TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(is_approved, rating) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_product_reviews_featured ON product_reviews(is_featured, created_at) WHERE is_featured = true AND is_approved = true;

-- 3. Habilitar Row Level Security
ALTER TABLE hero_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para hero_settings
CREATE POLICY "Hero settings visible for all" ON hero_settings
  FOR SELECT USING (true);

CREATE POLICY "Hero settings manageable by admin" ON hero_settings
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin')
    )
  );

-- Políticas de seguridad para product_reviews
CREATE POLICY "Approved reviews visible for all" ON product_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Anyone can create reviews" ON product_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Reviews manageable by admin" ON product_reviews
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin')
    )
  );

-- 4. DATOS DE PRUEBA / SEED

-- Hero settings default
INSERT INTO hero_settings (
  badge, title_line1, title_line2, title_line2_style, description,
  button1_text, button1_url, button2_text, button2_url,
  image_main_url, image_top_url, image_bottom_url
) VALUES (
  'Elite Animal Companionship',
  'The Luxury',
  'Pet Atelier.',
  'italic',
  'We treat the bond between humans and pets as a high-art form. Explore our curated selection of rare companions and bespoke wellness rituals.',
  'Explore Collection',
  '#products',
  'Our Story',
  '#story',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
  'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&q=80',
  'https://images.unsplash.com/photo-1553882809-a4f57e595701?w=400&q=80'
);

-- Reviews de prueba (aprobados para landing)
WITH product_ids AS (
  SELECT id FROM products LIMIT 5
)
INSERT INTO product_reviews (product_id, client_name, client_title, client_avatar_url, rating, title, comment, is_approved, is_featured)
SELECT
  p.id,
  'Eleanor Vance',
  'Interior Architect',
  'https://i.pravatar.cc/150?u=eleanor',
  5,
  'Absolute Perfection',
  '"The level of curation at Animal Store is unparalleled. My companion hasn''t just joined my home; they''ve elevated my lifestyle."',
  true, true
FROM product_ids p LIMIT 1;

WITH product_ids AS (
  SELECT id FROM products LIMIT 5 OFFSET 1
)
INSERT INTO product_reviews (product_id, client_name, client_title, client_avatar_url, rating, title, comment, is_approved, is_featured)
SELECT
  p.id,
  'Julian Thorne',
  'Creative Director',
  'https://i.pravatar.cc/150?u=julian',
  5,
  'Transformative Experience',
  '"The Wellness Rituals have completely transformed my retriever''s energy. It''s rare to find products that balance tech and soul so perfectly."',
  true, true
FROM product_ids p LIMIT 1;

WITH product_ids AS (
  SELECT id FROM products LIMIT 5 OFFSET 2
)
INSERT INTO product_reviews (product_id, client_name, client_title, client_avatar_url, rating, title, comment, is_approved, is_featured)
SELECT
  p.id,
  'Sienna Rossi',
  'Art Consultant',
  'https://i.pravatar.cc/150?u=sienna',
  5,
  'A Masterpiece',
  '"The consultation process felt more like a gallery tour than a pet shop. Truly a masterpiece of animal care."',
  true, true
FROM product_ids p LIMIT 1;

-- Reviews pendientes de aprobación
WITH product_ids AS (
  SELECT id FROM products LIMIT 5 OFFSET 3
)
INSERT INTO product_reviews (product_id, client_name, client_title, client_avatar_url, rating, title, comment, is_approved)
SELECT
  p.id,
  'Marcus Chen',
  'Tech Entrepreneur',
  'https://i.pravatar.cc/150?u=marcus',
  4,
  'Great but room for improvement',
  '"Wonderful products and excellent service. The delivery took a bit longer than expected though."',
  false
FROM product_ids p LIMIT 1;

WITH product_ids AS (
  SELECT id FROM products LIMIT 5 OFFSET 4
)
INSERT INTO product_reviews (product_id, client_name, client_title, client_avatar_url, rating, title, comment, is_approved)
SELECT
  p.id,
  'Priya Patel',
  'Veterinarian',
  'https://i.pravatar.cc/150?u=priya',
  5,
  'Exceptional Quality',
  '"As a veterinarian, I am impressed by the quality and thoughtfulness of these products. Highly recommended!"',
  false
FROM product_ids p LIMIT 1;

-- Reviews con diferentes puntuaciones para variar
INSERT INTO product_reviews (product_id, client_name, rating, comment, is_approved)
SELECT id, 'Alex Rivera', 5, '"Increíble calidad y atención al detalle. Mi mascota está más feliz que nunca."', true
FROM products WHERE featured = true LIMIT 1;

INSERT INTO product_reviews (product_id, client_name, rating, comment, is_approved)
SELECT id, 'Sarah Williams', 4, '"Muy buenos productos, aunque el empaque podría mejorar. El servicio al cliente es excelente."', true
FROM products WHERE featured = true LIMIT 1 OFFSET 1;

INSERT INTO product_reviews (product_id, client_name, rating, comment, is_approved)
SELECT id, 'James O''Brien', 3, '"Productos de buena calidad, pero esperaba más variedad. La entrega fue rápida."', true
FROM products WHERE featured = true LIMIT 1 OFFSET 2;
