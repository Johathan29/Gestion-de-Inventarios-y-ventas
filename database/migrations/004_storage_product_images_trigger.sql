-- ============================================================
-- Migración: 004_storage_product_images_trigger.sql
-- Descripción: Triggers automáticos que sincronizan las URLs
--              de imágenes en products.images cuando se suben
--              o eliminan archivos del bucket 'product-images'
--              en Supabase Storage.
--
-- ⚠️ ANTES DE EJECUTAR: Reemplaza la URL del proyecto abajo
--    (líneas marcadas con ←)
--    Está en: .env → SUPABASE_URL
--    O en:    Supabase Dashboard → Project Settings → API → Project URL
-- ============================================================

-- ============================================================
-- 1. Función: INSERT en storage.objects
--    Se dispara cuando se sube un archivo al bucket
--    Extrae el product ID del path y agrega la URL pública
--    al array JSONB images del producto correspondiente.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_product_image_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_public_url TEXT;
  -- ═══════════════════════════════════════════════════════
  --  IMPORTANTE: Cambia esta URL por la de tu proyecto ⤵
  -- ═══════════════════════════════════════════════════════
  v_supabase_url CONSTANT TEXT := 'https://prspnfxfspokbqxsboby.supabase.co';
BEGIN
  -- Solo procesar el bucket de imágenes de productos
  IF NEW.bucket_id = 'product-images' THEN

    -- Extraer el UUID del producto desde la ruta:
    --   products/{product_id}/{timestamp}-{random}.{ext}
    BEGIN
      v_product_id := (regexp_match(NEW.name, '^products/([a-f0-9\-]{36})/'))[1]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NEW;
    END;

    IF v_product_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Verificar que el producto exista antes de actualizar
    PERFORM 1 FROM public.products WHERE id = v_product_id;
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    -- Construir la URL pública
    --   https://{project}.supabase.co/storage/v1/object/public/product-images/products/{id}/{file}
    v_public_url := v_supabase_url || '/storage/v1/object/public/product-images/' || NEW.name;

    -- Agregar la URL al array (evitando duplicados con el operador @>)
    -- NOTA: Usamos jsonb_build_array para crear un array, NO to_jsonb (que hace string escalar)
    UPDATE public.products
    SET images = CASE
        WHEN images IS NULL OR images = '[]'::jsonb THEN jsonb_build_array(v_public_url)
        WHEN NOT images @> to_jsonb(v_public_url) THEN images || to_jsonb(v_public_url)
        ELSE images
      END,
      updated_at = NOW()
    WHERE id = v_product_id;

  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Función: DELETE en storage.objects
--    Se dispara cuando se elimina un archivo del bucket
--    Remueve la URL correspondiente del array images.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_product_image_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_public_url TEXT;
  -- ═══════════════════════════════════════════════════════
  --  IMPORTANTE: Cambia esta URL por la de tu proyecto ⤵
  -- ═══════════════════════════════════════════════════════
  v_supabase_url CONSTANT TEXT := 'https://prspnfxfspokbqxsboby.supabase.co';
BEGIN
  -- Solo procesar el bucket de imágenes de productos
  IF OLD.bucket_id = 'product-images' THEN

    -- Extraer el UUID del producto
    BEGIN
      v_product_id := (regexp_match(OLD.name, '^products/([a-f0-9\-]{36})/'))[1]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN OLD;
    END;

    IF v_product_id IS NULL THEN
      RETURN OLD;
    END IF;

    -- Construir la URL pública
    v_public_url := v_supabase_url || '/storage/v1/object/public/product-images/' || OLD.name;

    -- Remover la URL del array JSONB preservando el orden
    UPDATE public.products
    SET images = (
      SELECT COALESCE(jsonb_agg(elem ORDER BY ordinality), '[]'::jsonb)
      FROM jsonb_array_elements(COALESCE(images, '[]'::jsonb))
        WITH ORDINALITY AS t(elem, ordinality)
      WHERE elem::text <> to_jsonb(v_public_url)::text
    ),
    updated_at = NOW()
    WHERE id = v_product_id
      AND images @> to_jsonb(v_public_url);

  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================
-- 3. Reparar productos existentes cuyo images se haya roto
--    (JSONB string escalar en vez de array — causado por to_jsonb)
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, images FROM public.products
    WHERE images IS NOT NULL
      AND jsonb_typeof(images) <> 'array'
  LOOP
    UPDATE public.products
    SET images = CASE
        WHEN r.images = '[]'::jsonb THEN '[]'::jsonb
        ELSE jsonb_build_array(r.images)
      END,
      updated_at = NOW()
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- ============================================================
-- 4. Crear triggers sobre storage.objects
-- ============================================================

-- Trigger AFTER INSERT: cada vez que se sube un archivo
DROP TRIGGER IF EXISTS on_product_image_upload ON storage.objects;
CREATE TRIGGER on_product_image_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_product_image_insert();

-- Trigger AFTER DELETE: cada vez que se elimina un archivo
DROP TRIGGER IF EXISTS on_product_image_delete ON storage.objects;
CREATE TRIGGER on_product_image_delete
  AFTER DELETE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_product_image_delete();

-- ============================================================
-- 5. VERIFICACIÓN (ejecutar después de crear los triggers)
-- ============================================================
--  a) Verificar que los triggers existen:
--      SELECT event_object_schema, event_object_table, trigger_name
--      FROM information_schema.triggers
--      WHERE trigger_name LIKE 'on_product_image_%';
--
--  b) Ver el contenido del bucket:
--      SELECT * FROM storage.objects
--      WHERE bucket_id = 'product-images'
--      ORDER BY created_at DESC LIMIT 10;
--
--  c) Ver productos con imágenes en la DB:
--      SELECT id, name, images FROM products
--      WHERE images IS NOT NULL AND images != '[]'::jsonb
--      ORDER BY updated_at DESC LIMIT 10;

-- ============================================================
-- 6. ROLLBACK (cómo deshacer)
