-- ============================================================
-- Migration 011: Make ecommerce_settings a singleton table
-- Solo permite UNA fila, con un ID fijo predecible.
-- El backend hará UPSERT en lugar de SELECT → INSERT/UPDATE.
-- ============================================================

-- 1. Eliminar filas duplicadas, conservando solo la más reciente
DELETE FROM ecommerce_settings a 
USING (
  SELECT id FROM ecommerce_settings 
  ORDER BY updated_at DESC NULLS LAST, created_at ASC 
  LIMIT 1 OFFSET 1
) b 
WHERE a.id = b.id;

-- 2. Fijar el ID de la fila restante a un UUID conocido
UPDATE ecommerce_settings 
SET id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE id != '00000000-0000-0000-0000-000000000001'::uuid;

-- 3. Insertar la fila por defecto si no existe ninguna
INSERT INTO ecommerce_settings (id, store_name)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, 'Mi Tienda'
WHERE NOT EXISTS (SELECT 1 FROM ecommerce_settings);

-- 4. Agregar constraint CHECK que fuerza el ID fijo
--    (ninguna otra fila puede tener un ID diferente)
ALTER TABLE ecommerce_settings 
ADD CONSTRAINT ecommerce_settings_singleton_check
CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid);

-- 5. (Opcional) Índice único parcial por seguridad adicional
CREATE UNIQUE INDEX IF NOT EXISTS idx_ecommerce_settings_singleton 
ON ecommerce_settings ((true));

-- 6. Trigger: BEFORE INSERT que redirige a UPDATE si ya existe
CREATE OR REPLACE FUNCTION fn_ecommerce_settings_singleton_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM ecommerce_settings) THEN
    UPDATE ecommerce_settings 
    SET store_name       = NEW.store_name,
        description      = NEW.description,
        logo_url         = NEW.logo_url,
        favicon_url      = NEW.favicon_url,
        contact_email    = NEW.contact_email,
        contact_phone    = NEW.contact_phone,
        phone            = NEW.phone,
        whatsapp_number  = NEW.whatsapp_number,
        whatsapp_message = NEW.whatsapp_message,
        address          = NEW.address,
        currency_code    = NEW.currency_code,
        currency_symbol  = NEW.currency_symbol,
        currency_name    = NEW.currency_name,
        country_code     = NEW.country_code,
        country          = NEW.country,
        locale           = NEW.locale,
        default_tax_rate_id = NEW.default_tax_rate_id,
        tax_included     = NEW.tax_included,
        banner_default_url = NEW.banner_default_url,
        banner_mobile_url  = NEW.banner_mobile_url,
        social_networks  = NEW.social_networks,
        seo_settings     = NEW.seo_settings,
        shipping_settings = NEW.shipping_settings,
        payment_settings = NEW.payment_settings,
        is_active        = NEW.is_active,
        updated_at       = NOW()
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
    RETURN NULL;
  END IF;
  NEW.id = '00000000-0000-0000-0000-000000000001'::uuid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ecommerce_settings_singleton_insert ON ecommerce_settings;
CREATE TRIGGER trg_ecommerce_settings_singleton_insert
BEFORE INSERT ON ecommerce_settings
FOR EACH ROW EXECUTE FUNCTION fn_ecommerce_settings_singleton_insert();

-- ============================================================
-- USO EN BACKEND (ejemplo con Supabase JS):
--
-- En lugar de SELECT → decidir INSERT/UPDATE:
--
--   await supabase
--     .from('ecommerce_settings')
--     .upsert({ id: '00000000-0000-0000-0000-000000000001', ...req.body })
--     .select()
--     .single();
--
-- El trigger + constraint garantizan que siempre
-- haya una sola fila con el ID fijo.
-- ============================================================
