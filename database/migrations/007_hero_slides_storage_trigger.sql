-- ============================================================
-- Migración: 007_hero_slides_storage_trigger.sql
-- Descripción:
--   - Crea el bucket 'hero-slides' en Supabase Storage
--   - Crea triggers que actualizan hero_slides.image_url
--     automáticamente cuando se sube/elimina una imagen
--   - Configura políticas RLS para el bucket
--
-- ⚠️ EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Crear el bucket 'hero-slides' si no existe (público)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-slides',
  'hero-slides',
  true,
  10485760, -- 10MB (las imágenes de hero pueden ser más grandes)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- ============================================================
-- 2. Políticas RLS para storage.objects bucket 'hero-slides'
-- ============================================================

-- Asegurar que RLS está habilitado en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- SELECT público (para que las URLs públicas funcionen)
DROP POLICY IF EXISTS "Public Read Access - hero-slides" ON storage.objects;
CREATE POLICY "Public Read Access - hero-slides"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'hero-slides');

-- INSERT para usuarios autenticados
DROP POLICY IF EXISTS "Authenticated Upload - hero-slides" ON storage.objects;
CREATE POLICY "Authenticated Upload - hero-slides"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'hero-slides'
    AND auth.role() = 'authenticated'
  );

-- DELETE para usuarios autenticados
DROP POLICY IF EXISTS "Authenticated Delete - hero-slides" ON storage.objects;
CREATE POLICY "Authenticated Delete - hero-slides"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'hero-slides'
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- 3. Función TRIGGER: INSERT en storage.objects
--    Se dispara cuando se sube un archivo al bucket 'hero-slides'
--    Extrae el slide ID del path y actualiza image_url
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_hero_slide_image_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slide_id UUID;
  v_public_url TEXT;
  v_supabase_url CONSTANT TEXT := 'https://prspnfxfspokbqxsboby.supabase.co';
BEGIN
  -- Solo procesar el bucket de hero slides
  IF NEW.bucket_id = 'hero-slides' THEN

    -- Extraer el UUID del slide desde la ruta:
    --   hero-slides/{slide_id}/{timestamp}-{random}.{ext}
    BEGIN
      v_slide_id := (regexp_match(NEW.name, '^hero-slides/([a-f0-9\-]{36})/'))[1]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NEW;
    END;

    IF v_slide_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Verificar que el slide exista
    PERFORM 1 FROM public.hero_slides WHERE id = v_slide_id;
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    -- Construir la URL pública
    v_public_url := v_supabase_url || '/storage/v1/object/public/hero-slides/' || NEW.name;

    -- Actualizar image_url del slide
    UPDATE public.hero_slides
    SET image_url = v_public_url,
        updated_at = NOW()
    WHERE id = v_slide_id;

  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. Función TRIGGER: DELETE en storage.objects
--    Se dispara cuando se elimina un archivo del bucket
--    Limpia image_url si coincide con la URL eliminada
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_hero_slide_image_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slide_id UUID;
  v_public_url TEXT;
  v_supabase_url CONSTANT TEXT := 'https://prspnfxfspokbqxsboby.supabase.co';
BEGIN
  -- Solo procesar el bucket de hero slides
  IF OLD.bucket_id = 'hero-slides' THEN

    -- Extraer el UUID del slide
    BEGIN
      v_slide_id := (regexp_match(OLD.name, '^hero-slides/([a-f0-9\-]{36})/'))[1]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN OLD;
    END;

    IF v_slide_id IS NULL THEN
      RETURN OLD;
    END IF;

    -- Construir la URL pública
    v_public_url := v_supabase_url || '/storage/v1/object/public/hero-slides/' || OLD.name;

    -- Limpiar image_url solo si coincide exactamente
    UPDATE public.hero_slides
    SET image_url = '',
        updated_at = NOW()
    WHERE id = v_slide_id
      AND image_url = v_public_url;

  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================
-- 5. Crear triggers sobre storage.objects
-- ============================================================

-- Trigger AFTER INSERT
DROP TRIGGER IF EXISTS on_hero_slide_image_upload ON storage.objects;
CREATE TRIGGER on_hero_slide_image_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_hero_slide_image_insert();

-- Trigger AFTER DELETE
DROP TRIGGER IF EXISTS on_hero_slide_image_delete ON storage.objects;
CREATE TRIGGER on_hero_slide_image_delete
  AFTER DELETE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_hero_slide_image_delete();

-- ============================================================
-- 6. VERIFICACIÓN
-- ============================================================
--  a) Bucket:
--      SELECT id, name, public FROM storage.buckets WHERE id = 'hero-slides';
--
--  b) Políticas:
--      SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
--
--  c) Triggers:
--      SELECT event_object_schema, event_object_table, trigger_name
--      FROM information_schema.triggers
--      WHERE trigger_name LIKE 'on_hero_slide_image_%';
--
--  d) Probar subida:
--      INSERT INTO storage.objects (bucket_id, name, owner, metadata)
--      VALUES ('hero-slides', 'hero-slides/00000000-0000-0000-0000-000000000000/test.jpg',
--              auth.uid(), '{"size": 1024, "mimetype": "image/jpeg"}');
--      Luego verificar: SELECT id, image_url FROM hero_slides WHERE id = '00000000-0000-0000-0000-000000000000';
