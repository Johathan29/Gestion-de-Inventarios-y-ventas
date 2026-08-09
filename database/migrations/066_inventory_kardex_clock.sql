-- ============================================================
-- MIGRACIÓN 066: KARDEX — created_at CON clock_timestamp()
-- ============================================================
-- Problema: inventory_movements.created_at DEFAULT now()
-- (= transaction_timestamp(), el INICIO de la transacción).
-- Bajo concurrencia, el orden de adquisición del lock de fila
-- (orden de serialización del stock) NO coincide con el orden
-- de inicio de las transacciones → el kardex ordenado por
-- created_at muestra filas intercaladas (p. ej. un exit
-- prev=25,new=20 aparece DESPUÉS de uno prev=20,new=15).
--
-- Solución: DEFAULT clock_timestamp() → marca el instante real
-- de la inserción. Como los movimientos se insertan DENTRO de
-- la transacción que mantiene el lock de la fila de inventory,
-- el orden de created_at ahora SÍ coincide con el orden de
-- serialización → kardex contiguo incluso bajo concurrencia.
-- ============================================================

ALTER TABLE public.inventory_movements
  ALTER COLUMN created_at SET DEFAULT clock_timestamp();
