-- ===================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO Y VENTAS
-- Migración 006: E-commerce Enhancements
--   - Hero Carousel (hasta 4 slides)
--   - Floating Banners globales
--   - Moneda / Impuestos (ITEBIS, IVA, etc.)
--   - WhatsApp Chatbot config
-- ===================================================

-- ============================================================
-- 1. HERO CAROUSEL SLIDES
--    Reemplaza la estructura anterior de hero_settings (single)
--    por múltiples slides con imágenes desde Supabase Storage
-- ============================================================
CREATE TABLE IF NOT EXISTS hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge VARCHAR(255) DEFAULT '',
  title_line1 VARCHAR(255) DEFAULT 'The Luxury',
  title_line2 VARCHAR(255) DEFAULT 'Pet Atelier.',
  title_line2_style VARCHAR(50) DEFAULT 'italic',
  description TEXT DEFAULT '',
  button1_text VARCHAR(100) DEFAULT 'Explore Collection',
  button1_url VARCHAR(500) DEFAULT '#products',
  button2_text VARCHAR(100) DEFAULT 'Our Story',
  button2_url VARCHAR(500) DEFAULT '#story',
  image_url TEXT NOT NULL DEFAULT '',
  image_mobile_url TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hero_slides_active_order ON hero_slides(is_active, sort_order);

-- ============================================================
-- 2. FLOATING BANNERS
--    Banners que se muestran flotando en toda la página
-- ============================================================
CREATE TABLE IF NOT EXISTS floating_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  subtitle TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  link_url VARCHAR(500) DEFAULT '',
  background_color VARCHAR(50) DEFAULT '#1a1a2e',
  text_color VARCHAR(50) DEFAULT '#ffffff',
  position VARCHAR(20) DEFAULT 'bottom' CHECK (position IN ('top', 'bottom')),
  is_sticky BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_floating_banners_active ON floating_banners(is_active, sort_order);

-- ============================================================
-- 3. CURRENCY & TAX CONFIG
--    Se añaden a ecommerce_settings (la tabla ya existe)
--    Se crea tabla separada para tasas de impuesto
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- Ej: "ITEBIS", "IVA", "GST", "VAT"
  code VARCHAR(20) NOT NULL, -- Ej: "ITEBIS", "IVA", "GST", "VAT"
  rate DECIMAL(5,2) NOT NULL, -- Porcentaje, ej: 18.00
  country_code VARCHAR(5) DEFAULT '', -- Código ISO del país
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, country_code)
);

-- Añadir columnas de moneda e impuestos a ecommerce_settings
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS currency_code VARCHAR(5) DEFAULT 'USD';
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '$';
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS currency_name VARCHAR(50) DEFAULT 'US Dollar';
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT '';
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS country_code VARCHAR(5) DEFAULT 'US';
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en-US';
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS default_tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL;
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS tax_included BOOLEAN DEFAULT false;
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS phone VARCHAR(30) DEFAULT '';
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30) DEFAULT '';
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS whatsapp_message TEXT DEFAULT '¡Hola! Bienvenido a {{store_name}}. ¿En qué podemos ayudarte?';
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS banner_default_url TEXT DEFAULT '';
ALTER TABLE ecommerce_settings ADD COLUMN IF NOT EXISTS banner_mobile_url TEXT DEFAULT '';

-- ============================================================
-- 4. WHATSAPP CONFIG
--    Configuración del chatbot de WhatsApp
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(30) NOT NULL DEFAULT '',
  api_token TEXT DEFAULT '',
  api_endpoint VARCHAR(500) DEFAULT 'https://api.whatsapp.com/send',
  welcome_message TEXT DEFAULT '¡Hola! ¿En qué podemos ayudarte?',
  auto_reply_enabled BOOLEAN DEFAULT true,
  business_hours JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solo una fila activa
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_config_active ON whatsapp_config(is_active) WHERE is_active = true;

-- Insertar configuración por defecto
INSERT INTO whatsapp_config (phone_number, welcome_message) VALUES ('', '¡Hola! ¿En qué podemos ayudarte?')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE floating_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (SELECT)
DROP POLICY IF EXISTS "Hero slides public SELECT" ON hero_slides;
CREATE POLICY "Hero slides public SELECT" ON hero_slides FOR SELECT USING (true);

DROP POLICY IF EXISTS "Floating banners public SELECT" ON floating_banners;
CREATE POLICY "Floating banners public SELECT" ON floating_banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tax rates public SELECT" ON tax_rates;
CREATE POLICY "Tax rates public SELECT" ON tax_rates FOR SELECT USING (true);

DROP POLICY IF EXISTS "WhatsApp config public SELECT" ON whatsapp_config;
CREATE POLICY "WhatsApp config public SELECT" ON whatsapp_config FOR SELECT USING (true);

-- Políticas admin (ALL)
CREATE POLICY "Hero slides admin ALL" ON hero_slides
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin'))
  );

CREATE POLICY "Floating banners admin ALL" ON floating_banners
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin'))
  );

CREATE POLICY "Tax rates admin ALL" ON tax_rates
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin'))
  );

CREATE POLICY "WhatsApp config admin ALL" ON whatsapp_config
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin'))
  );

-- ============================================================
-- 6. SEED DATA - Tax rates por defecto
-- ============================================================
INSERT INTO tax_rates (name, code, rate, country_code, is_default, description) VALUES
  ('ITEBIS (República Dominicana)', 'ITEBIS', 18.00, 'DO', true, 'Impuesto a la Transferencia de Bienes Industrializados y Servicios'),
  ('IVA (España)', 'IVA', 21.00, 'ES', true, 'Impuesto al Valor Agregado - General'),
  ('IVA Reducido (España)', 'IVA', 10.00, 'ES', false, 'IVA Reducido'),
  ('GST (Canada)', 'GST', 5.00, 'CA', true, 'Goods and Services Tax'),
  ('VAT (UK)', 'VAT', 20.00, 'GB', true, 'Value Added Tax'),
  ('IVA (México)', 'IVA', 16.00, 'MX', true, 'Impuesto al Valor Agregado'),
  ('IVA (Colombia)', 'IVA', 19.00, 'CO', true, 'Impuesto al Valor Agregado'),
  ('Sales Tax (US)', 'Sales Tax', 8.00, 'US', true, 'Sales Tax')
ON CONFLICT (code, country_code) DO NOTHING;

-- ============================================================
-- 7. ACTUALIZAR ecommerce_settings con valores por defecto
-- ============================================================
UPDATE ecommerce_settings SET
  currency_code = 'USD',
  currency_symbol = '$',
  currency_name = 'US Dollar',
  country = 'United States',
  country_code = 'US',
  locale = 'en-US',
  tax_included = false
WHERE currency_code IS NULL;
