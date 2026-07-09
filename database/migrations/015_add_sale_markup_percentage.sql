-- ============================================================
-- Migration 015: Add sale_markup_percentage to ecommerce_settings
-- Permite configurar el porcentaje de ganancia sobre el precio
-- de costo para calcular el precio de venta automáticamente.
-- Default: 10 (10% de margen sobre el costo)
-- ============================================================

ALTER TABLE ecommerce_settings 
ADD COLUMN IF NOT EXISTS sale_markup_percentage DECIMAL(5,2) DEFAULT 10.00;

-- Actualizar el trigger singleton para incluir el nuevo campo
CREATE OR REPLACE FUNCTION fn_ecommerce_settings_singleton_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM ecommerce_settings) THEN
    UPDATE ecommerce_settings 
    SET store_name              = NEW.store_name,
        description             = NEW.description,
        logo_url                = NEW.logo_url,
        favicon_url             = NEW.favicon_url,
        contact_email           = NEW.contact_email,
        contact_phone           = NEW.contact_phone,
        phone                   = NEW.phone,
        whatsapp_number         = NEW.whatsapp_number,
        whatsapp_message        = NEW.whatsapp_message,
        address                 = NEW.address,
        currency_code           = NEW.currency_code,
        currency_symbol         = NEW.currency_symbol,
        currency_name           = NEW.currency_name,
        country_code            = NEW.country_code,
        country                 = NEW.country,
        locale                  = NEW.locale,
        default_tax_rate_id     = NEW.default_tax_rate_id,
        tax_included            = NEW.tax_included,
        sale_markup_percentage  = NEW.sale_markup_percentage,
        banner_default_url      = NEW.banner_default_url,
        banner_mobile_url       = NEW.banner_mobile_url,
        social_networks         = NEW.social_networks,
        seo_settings            = NEW.seo_settings,
        shipping_settings       = NEW.shipping_settings,
        payment_settings        = NEW.payment_settings,
        is_active               = NEW.is_active,
        updated_at              = NOW()
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
    RETURN NULL;
  END IF;
  NEW.id = '00000000-0000-0000-0000-000000000001'::uuid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
