-- ============================================================
-- Migration 012: Branding Storage Bucket + Triggers
--   - Crea el bucket 'branding' en Supabase Storage
--   - Triggers que actualizan ecommerce_settings.logo_url
--     y ecommerce_settings.favicon_url automáticamente
--     al subir/eliminar archivos
--
-- Convención de paths (relativos al bucket):
--   logo/{timestamp}-{random}.{ext}  → logo_url
--   favicon/{timestamp}-{random}.{ext} → favicon_url
--
-- ⚠️ EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Crear el bucket 'branding' (público, imágenes)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif', 'image/x-icon', 'image/vnd.microsoft.icon']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif', 'image/x-icon', 'image/vnd.microsoft.icon']::text[];

-- ============================================================
-- 2. Políticas RLS para storage.objects bucket 'branding'
-- ============================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- SELECT público (para que las URLs públicas funcionen)
DROP POLICY IF EXISTS "Public Read Access - branding" ON storage.objects;
CREATE POLICY "Public Read Access - branding"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'branding');

-- INSERT para usuarios autenticados (o anónimos con anon key desde el frontend)
DROP POLICY IF EXISTS "Authenticated Upload - branding" ON storage.objects;
CREATE POLICY "Authenticated Upload - branding"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'branding'
    AND auth.role() IN ('authenticated', 'anon')
  );

-- DELETE para usuarios autenticados (o anónimos con anon key)
DROP POLICY IF EXISTS "Authenticated Delete - branding" ON storage.objects;
CREATE POLICY "Authenticated Delete - branding"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'branding'
    AND auth.role() IN ('authenticated', 'anon')
  );

-- UPDATE para usuarios autenticados (o anónimos con anon key)
DROP POLICY IF EXISTS "Authenticated Update - branding" ON storage.objects;
CREATE POLICY "Authenticated Update - branding"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'branding'
    AND auth.role() IN ('authenticated', 'anon')
  );

-- ============================================================
-- 3. Función TRIGGER: INSERT en storage.objects
--    Se dispara cuando se sube un archivo al bucket 'branding'
--    Detecta si es logo o favicon por el path y actualiza
--    el campo correspondiente en ecommerce_settings
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_branding_image_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_public_url TEXT;
  v_supabase_url CONSTANT TEXT := 'https://prspnfxfspokbqxsboby.supabase.co';
  v_settings_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Solo procesar el bucket de branding
  IF NEW.bucket_id = 'branding' THEN

    -- Construir la URL pública
    v_public_url := v_supabase_url || '/storage/v1/object/public/branding/' || NEW.name;

    -- Detectar tipo por el prefijo del path (sin bucket, solo subpath)
    IF NEW.name LIKE 'logo/%' THEN
      -- Actualizar logo_url
      UPDATE public.ecommerce_settings
      SET logo_url = v_public_url,
          updated_at = NOW()
      WHERE id = v_settings_id;

    ELSIF NEW.name LIKE 'favicon/%' THEN
      -- Actualizar favicon_url
      UPDATE public.ecommerce_settings
      SET favicon_url = v_public_url,
          updated_at = NOW()
      WHERE id = v_settings_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. Función TRIGGER: DELETE en storage.objects
--    Limpia logo_url o favicon_url si la URL eliminada coincide
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_branding_image_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_public_url TEXT;
  v_supabase_url CONSTANT TEXT := 'https://prspnfxfspokbqxsboby.supabase.co';
  v_settings_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Solo procesar el bucket de branding
  IF OLD.bucket_id = 'branding' THEN

    -- Construir la URL pública
    v_public_url := v_supabase_url || '/storage/v1/object/public/branding/' || OLD.name;

    -- Si se eliminó un logo, limpiar logo_url si coincide
    IF OLD.name LIKE 'logo/%' THEN
      UPDATE public.ecommerce_settings
      SET logo_url = '',
          updated_at = NOW()
      WHERE id = v_settings_id
        AND logo_url = v_public_url;

    -- Si se eliminó un favicon, limpiar favicon_url si coincide
    ELSIF OLD.name LIKE 'favicon/%' THEN
      UPDATE public.ecommerce_settings
      SET favicon_url = '',
          updated_at = NOW()
      WHERE id = v_settings_id
        AND favicon_url = v_public_url;
    END IF;

  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================
-- 5. Crear triggers sobre storage.objects
-- ============================================================

-- Trigger AFTER INSERT
DROP TRIGGER IF EXISTS on_branding_image_upload ON storage.objects;
CREATE TRIGGER on_branding_image_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_branding_image_insert();

-- Trigger AFTER DELETE
DROP TRIGGER IF EXISTS on_branding_image_delete ON storage.objects;
CREATE TRIGGER on_branding_image_delete
  AFTER DELETE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_branding_image_delete();

-- ============================================================
-- 6. VERIFICACIÓN
-- ============================================================
--  a) Bucket:
--      SELECT id, name, public FROM storage.buckets WHERE id = 'branding';
--
--  b) Políticas:
--      SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
--      ORDER BY policyname;
--
--  c) Triggers:
--      SELECT event_object_schema, event_object_table, trigger_name
--      FROM information_schema.triggers
--      WHERE trigger_name LIKE 'on_branding_image_%';
--
--  d) Probar subida de logo:
--      INSERT INTO storage.objects (bucket_id, name, owner, metadata)
--      VALUES ('branding', 'logo/1723456789-test-logo.png',
--              auth.uid(), '{"size": 1024, "mimetype": "image/png"}');
--      Luego verificar: SELECT id, logo_url FROM ecommerce_settings
--      WHERE id = '00000000-0000-0000-0000-000000000001';
--
--  e) Probar subida de favicon:
--      INSERT INTO storage.objects (bucket_id, name, owner, metadata)
--      VALUES ('branding', 'favicon/1723456789-test-favicon.png',
--              auth.uid(), '{"size": 512, "mimetype": "image/png"}');
--      Luego verificar: SELECT id, favicon_url FROM ecommerce_settings
--      WHERE id = '00000000-0000-0000-0000-000000000001';
