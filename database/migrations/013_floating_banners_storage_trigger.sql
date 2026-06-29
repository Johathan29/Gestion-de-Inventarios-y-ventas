-- ============================================================
-- Migración: 013_floating_banners_storage_trigger.sql
-- Descripción:
--   - Crea el bucket 'floating-banners' en Supabase Storage
--   - Crea triggers que actualizan floating_banners.image_url
--     automáticamente cuando se sube/elimina una imagen
--   - Configura políticas RLS para el bucket
--
-- ⚠️ EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Crear el bucket 'floating-banners' si no existe (público)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'floating-banners',
  'floating-banners',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- ============================================================
-- 2. Políticas RLS para storage.objects bucket 'floating-banners'
-- ============================================================

-- Asegurar que RLS está habilitado en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- SELECT público (para que las URLs públicas funcionen)
DROP POLICY IF EXISTS "Public Read Access - floating-banners" ON storage.objects;
CREATE POLICY "Public Read Access - floating-banners"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'floating-banners');

-- INSERT para usuarios autenticados
DROP POLICY IF EXISTS "Authenticated Upload - floating-banners" ON storage.objects;
CREATE POLICY "Authenticated Upload - floating-banners"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'floating-banners'
    AND auth.role() = 'authenticated'
  );

-- DELETE para usuarios autenticados
DROP POLICY IF EXISTS "Authenticated Delete - floating-banners" ON storage.objects;
CREATE POLICY "Authenticated Delete - floating-banners"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'floating-banners'
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- 3. Función TRIGGER: INSERT en storage.objects
--    Se dispara cuando se sube un archivo al bucket 'floating-banners'
--    Extrae el banner ID del path y actualiza image_url
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_floating_banner_image_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_banner_id UUID;
  v_public_url TEXT;
  v_supabase_url CONSTANT TEXT := 'https://prspnfxfspokbqxsboby.supabase.co';
BEGIN
  -- Solo procesar el bucket de floating banners
  IF NEW.bucket_id = 'floating-banners' THEN

    -- Extraer el UUID del banner desde la ruta:
    --   floating-banners/{banner_id}/{timestamp}-{random}.{ext}
    BEGIN
      v_banner_id := (regexp_match(NEW.name, '^floating-banners/([a-f0-9\-]{36})/'))[1]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NEW;
    END;

    IF v_banner_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Verificar que el banner exista
    PERFORM 1 FROM public.floating_banners WHERE id = v_banner_id;
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    -- Construir la URL pública
    v_public_url := v_supabase_url || '/storage/v1/object/public/floating-banners/' || NEW.name;

    -- Actualizar image_url del banner
    UPDATE public.floating_banners
    SET image_url = v_public_url,
        updated_at = NOW()
    WHERE id = v_banner_id;

  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. Función TRIGGER: DELETE en storage.objects
--    Se dispara cuando se elimina un archivo del bucket
--    Limpia image_url si coincide con la URL eliminada
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_floating_banner_image_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_banner_id UUID;
  v_public_url TEXT;
  v_supabase_url CONSTANT TEXT := 'https://prspnfxfspokbqxsboby.supabase.co';
BEGIN
  -- Solo procesar el bucket de floating banners
  IF OLD.bucket_id = 'floating-banners' THEN

    -- Extraer el UUID del banner
    BEGIN
      v_banner_id := (regexp_match(OLD.name, '^floating-banners/([a-f0-9\-]{36})/'))[1]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN OLD;
    END;

    IF v_banner_id IS NULL THEN
      RETURN OLD;
    END IF;

    -- Construir la URL pública
    v_public_url := v_supabase_url || '/storage/v1/object/public/floating-banners/' || OLD.name;

    -- Limpiar image_url solo si coincide exactamente
    UPDATE public.floating_banners
    SET image_url = '',
        updated_at = NOW()
    WHERE id = v_banner_id
      AND image_url = v_public_url;

  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================
-- 5. Crear triggers sobre storage.objects
-- ============================================================

-- Trigger AFTER INSERT
DROP TRIGGER IF EXISTS on_floating_banner_image_upload ON storage.objects;
CREATE TRIGGER on_floating_banner_image_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_floating_banner_image_insert();

-- Trigger AFTER DELETE
DROP TRIGGER IF EXISTS on_floating_banner_image_delete ON storage.objects;
CREATE TRIGGER on_floating_banner_image_delete
  AFTER DELETE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_floating_banner_image_delete();

-- ============================================================
-- 6. VERIFICACIÓN
-- ============================================================
--  a) Bucket:
--      SELECT id, name, public FROM storage.buckets WHERE id = 'floating-banners';
--
--  b) Políticas:
--      SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
--
--  c) Triggers:
--      SELECT event_object_schema, event_object_table, trigger_name
--      FROM information_schema.triggers
--      WHERE trigger_name LIKE 'on_floating_banner_image_%';
--
--  d) Probar subida:
--      INSERT INTO storage.objects (bucket_id, name, owner, metadata)
--      VALUES ('floating-banners', 'floating-banners/00000000-0000-0000-0000-000000000000/test.jpg',
--              auth.uid(), '{"size": 1024, "mimetype": "image/jpeg"}');
--      Luego verificar: SELECT id, image_url FROM floating_banners WHERE id = '00000000-0000-0000-0000-000000000000';
