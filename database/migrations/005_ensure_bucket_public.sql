-- ============================================================
-- Migración: 005_ensure_bucket_public.sql
-- Descripción: Asegura que el bucket 'product-images' exista
--              y tenga permisos de lectura pública para que
--              las URLs de imágenes funcionen en el frontend.
--
-- ⚠️ EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Crear el bucket si no existe (con acceso público)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- ============================================================
-- 2. Política: Permitir SELECT público en storage.objects
--    para el bucket 'product-images'
--    (Necesaria para que las URLs públicas funcionen)
-- ============================================================

-- Habilitar RLS en storage.objects si no está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Eliminar política existente si ya existe (para evitar duplicados)
DROP POLICY IF EXISTS "Public Read Access - product-images" ON storage.objects;

-- Crear política que permite SELECT público
CREATE POLICY "Public Read Access - product-images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- ============================================================
-- 3. Política: Permitir INSERT a usuarios autenticados
--    (necesario para que el frontend pueda subir directamente
--     desde el navegador cuando el backend no está disponible)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated Upload - product-images" ON storage.objects;
CREATE POLICY "Authenticated Upload - product-images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- 4. Política: Permitir DELETE a usuarios autenticados
--    (necesario para eliminar imágenes desde el frontend)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated Delete - product-images" ON storage.objects;
CREATE POLICY "Authenticated Delete - product-images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- 5. VERIFICACIÓN
-- ============================================================
--  a) Verificar que el bucket es público:
--      SELECT id, name, public FROM storage.buckets
--      WHERE id = 'product-images';
--
--  b) Verificar las políticas:
--      SELECT * FROM pg_policies
--      WHERE tablename = 'objects'
--      AND schemaname = 'storage';
--
--  c) Probar URL pública (reemplazar {file_path}):
--      https://prspnfxfspokbqxsboby.supabase.co/storage/v1/object/public/product-images/{file_path}
