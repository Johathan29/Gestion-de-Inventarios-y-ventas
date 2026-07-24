-- ============================================================
-- Migración: 023_fix_storage_rls_product_images.sql
-- Descripción: Modifica la política de INSERT en storage.objects
--              para que permita también al rol 'anon' subir
--              archivos al bucket 'product-images'.
--
--              Esto es necesario porque el frontend usa la
--              Supabase anon key (VITE_SUPABASE_PUBLISHABLE_KEY)
--              para subir imágenes de variantes directamente
--              desde el navegador.
--
--              El bucket ya es público (SELECT permitido para
--              cualquier rol), por lo que permitir INSERT con
--              anon es consistente.
-- ============================================================

-- Eliminar política existente que solo permite authenticated
DROP POLICY IF EXISTS "Authenticated Upload - product-images" ON storage.objects;

-- Crear política que permite INSERT también para anon
CREATE POLICY "Public Upload - product-images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() IN ('anon', 'authenticated')
  );

-- También actualizar DELETE para permitir anon
DROP POLICY IF EXISTS "Authenticated Delete - product-images" ON storage.objects;
CREATE POLICY "Public Delete - product-images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND auth.role() IN ('anon', 'authenticated')
  );
