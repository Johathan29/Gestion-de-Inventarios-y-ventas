-- ============================================================
-- Migración: 009_fix_hero_slides_storage_rls.sql
-- Descripción:
--   Corrige las políticas RLS del bucket 'hero-slides' para
--   permitir subida/eliminación desde el frontend.
--
--   El frontend usa la anon key de Supabase (no tiene sesión
--   de Supabase Auth), por lo que auth.role() = 'anon',
--   no 'authenticated'. La política anterior exigía
--   'authenticated' y bloqueaba las subidas.
--
-- ⚠️ EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Reemplazar políticas existentes para que acepten anon
-- ============================================================

-- INSERT: Permitir tanto a usuarios autenticados como anónimos
DROP POLICY IF EXISTS "Authenticated Upload - hero-slides" ON storage.objects;
CREATE POLICY "Public Upload - hero-slides"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'hero-slides'
    AND auth.role() IN ('authenticated', 'anon')
  );

-- DELETE: Permitir tanto a usuarios autenticados como anónimos
DROP POLICY IF EXISTS "Authenticated Delete - hero-slides" ON storage.objects;
CREATE POLICY "Public Delete - hero-slides"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'hero-slides'
    AND auth.role() IN ('authenticated', 'anon')
  );

-- ============================================================
-- 2. VERIFICACIÓN
-- ============================================================
--  a) Verificar las políticas actualizadas:
--      SELECT * FROM pg_policies
--      WHERE tablename = 'objects'
--      AND schemaname = 'storage'
--      AND policyname LIKE '%hero-slides%';
--
--  b) Probar subida desde el frontend (la imagen se sube al
--     bucket y el trigger on_hero_slide_image_upload actualiza
--     automáticamente hero_slides.image_url)
