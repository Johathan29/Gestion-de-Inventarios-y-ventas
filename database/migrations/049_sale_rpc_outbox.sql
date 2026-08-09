-- ===================================================
-- MIGRATION 049: sp_create_sale transaccional + Outbox pattern
-- ===================================================
-- 1. sp_create_sale: crea venta + items + decremento de stock (vía triggers)
--    + eventos outbox en UNA sola transacción SQL.
-- 2. Helpers de outbox: sp_get_pending_outbox / sp_mark_outbox_published
--    para el relay que publica eventos a RabbitMQ/EventBus.
-- ===================================================

-- Índice para consultas del relay outbox
CREATE INDEX IF NOT EXISTS idx_outbox_status_created
  ON transactional_outbox (status, created_at);

-- Idempotencia de pagos: clave única por intento de cobro (reintentos seguros)
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_idempotency
  ON payment_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ===================================================
-- 1. RPC TRANSACCIONAL: sp_create_sale
-- ===================================================
-- Uso (desde Node):
--   supabase.rpc('sp_create_sale', {
--     p_company_id, p_user_id, p_client_id,
--     p_sale_data: { status, subtotal, tax, discount, total,
--                    payment_method, payment_status, notes,
--                    shipping_address, source },
--     p_items: [{ product_id, product_name, sku, quantity,
--                 unit_price, discount, tax, total,
--                 variant_id, variant_name, variant_attributes }],
--     p_correlation_id
--   })
--
-- El trigger decrease_stock_from_sale (migración 025) valida stock
-- disponible y descuenta inventory/product_variants en la misma transacción.
-- Si algún item no tiene stock → RAISE EXCEPTION → rollback completo.

CREATE OR REPLACE FUNCTION public.sp_create_sale(
  p_company_id uuid,
  p_user_id uuid,
  p_client_id uuid DEFAULT NULL,
  p_sale_data jsonb DEFAULT '{}'::jsonb,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_correlation_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_sale_number varchar(50);
  v_item jsonb;
  v_total numeric;
  v_subtotal numeric;
  v_discount numeric;
  v_tax numeric;
BEGIN
  v_sale_id := gen_random_uuid();
  v_sale_number := generate_sale_number();

  v_subtotal := COALESCE((p_sale_data->>'subtotal')::numeric, 0);
  v_discount := COALESCE((p_sale_data->>'discount')::numeric, 0);
  v_tax      := COALESCE((p_sale_data->>'tax')::numeric, 0);
  v_total    := COALESCE((p_sale_data->>'total')::numeric, v_subtotal - v_discount + v_tax);

  -- 1. Cabecera de venta
  INSERT INTO sales (
    id, sale_number, client_id, user_id, company_id,
    status, subtotal, tax, discount, total,
    payment_method, payment_status, notes, shipping_address, source
  ) VALUES (
    v_sale_id, v_sale_number, p_client_id, p_user_id, p_company_id,
    COALESCE((p_sale_data->>'status')::varchar, 'completed'),
    v_subtotal, v_tax, v_discount, v_total,
    COALESCE((p_sale_data->>'payment_method')::varchar, 'cash'),
    COALESCE((p_sale_data->>'payment_status')::varchar, 'paid'),
    NULLIF(p_sale_data->>'notes', ''),
    NULLIF(p_sale_data->>'shipping_address', ''),
    COALESCE((p_sale_data->>'source')::varchar, 'pos')
  );

  -- 2. Items (el trigger decrease_stock_from_sale valida y descuenta stock;
  --    si no hay stock lanza excepción y revierte TODO)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO sale_items (
      id, sale_id, product_id, product_name, sku, quantity,
      unit_price, discount, tax, total,
      variant_id, variant_name, variant_attributes
    ) VALUES (
      gen_random_uuid(), v_sale_id,
      (v_item->>'product_id')::uuid,
      COALESCE(v_item->>'product_name', ''),
      NULLIF(v_item->>'sku', ''),
      GREATEST(1, (v_item->>'quantity')::int),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE((v_item->>'discount')::numeric, 0),
      COALESCE((v_item->>'tax')::numeric, 0),
      COALESCE(
        (v_item->>'total')::numeric,
        ((v_item->>'quantity')::int * COALESCE((v_item->>'unit_price')::numeric, 0))
      ),
      CASE WHEN v_item->>'variant_id' IS NOT NULL THEN (v_item->>'variant_id')::uuid ELSE NULL END,
      NULLIF(v_item->>'variant_name', ''),
      COALESCE((v_item->>'variant_attributes')::jsonb, '{}'::jsonb)
    );
  END LOOP;

  -- 3. Outbox: eventos creados en la MISMA transacción que la venta
  INSERT INTO transactional_outbox (
    event_type, aggregate_type, aggregate_id, payload,
    correlation_id, caused_by_user_id, company_id
  ) VALUES
    ('sales.sale.created', 'sale', v_sale_id,
     jsonb_build_object(
       'saleId', v_sale_id,
       'saleNumber', v_sale_number,
       'userId', p_user_id,
       'clientId', p_client_id,
       'total', v_total,
       'paymentMethod', COALESCE((p_sale_data->>'payment_method')::varchar, 'cash'),
       'source', COALESCE((p_sale_data->>'source')::varchar, 'pos'),
       'companyId', p_company_id
     ),
     p_correlation_id, p_user_id, p_company_id),

    ('sales.sale.completed', 'sale', v_sale_id,
     jsonb_build_object(
       'saleId', v_sale_id,
       'saleNumber', v_sale_number,
       'userId', p_user_id,
       'total', v_total,
       'paymentMethod', COALESCE((p_sale_data->>'payment_method')::varchar, 'cash'),
       'companyId', p_company_id
     ),
     p_correlation_id, p_user_id, p_company_id);

  IF COALESCE((p_sale_data->>'source')::varchar, 'pos') = 'ecommerce' THEN
    INSERT INTO transactional_outbox (
      event_type, aggregate_type, aggregate_id, payload,
      correlation_id, caused_by_user_id, company_id
    ) VALUES (
      'sales.checkout.completed', 'sale', v_sale_id,
      jsonb_build_object(
        'saleId', v_sale_id,
        'saleNumber', v_sale_number,
        'userId', p_user_id,
        'total', v_total,
        'itemCount', jsonb_array_length(p_items),
        'companyId', p_company_id
      ),
      p_correlation_id, p_user_id, p_company_id
    );
  END IF;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'sale_number', v_sale_number);
END;
$$;

-- ===================================================
-- 2. HELPERS DE OUTBOX (para el relay)
-- ===================================================

-- Obtiene eventos pendientes de publicar (con reintentos)
CREATE OR REPLACE FUNCTION public.sp_get_pending_outbox(
  p_limit integer DEFAULT 100
) RETURNS TABLE(
  id uuid,
  event_type varchar,
  aggregate_type varchar,
  aggregate_id uuid,
  payload jsonb,
  correlation_id uuid,
  company_id uuid,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.event_type, o.aggregate_type, o.aggregate_id,
         o.payload, o.correlation_id, o.company_id, o.created_at
  FROM transactional_outbox o
  WHERE o.status = 'pending' AND o.retry_count < o.max_retries
  ORDER BY o.created_at ASC
  LIMIT p_limit;
$$;

-- Marca eventos como publicados (batch)
CREATE OR REPLACE FUNCTION public.sp_mark_outbox_published(
  p_ids uuid[]
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE transactional_outbox
  SET status = 'published', processed_at = NOW()
  WHERE id = ANY(p_ids);
$$;

-- Marca eventos como fallidos (incrementa retry_count)
CREATE OR REPLACE FUNCTION public.sp_mark_outbox_failed(
  p_ids uuid[],
  p_error text DEFAULT NULL
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE transactional_outbox
  SET status = CASE WHEN retry_count + 1 >= max_retries THEN 'failed' ELSE 'pending' END,
      retry_count = retry_count + 1,
      last_error = p_error
  WHERE id = ANY(p_ids);
$$;

COMMENT ON FUNCTION public.sp_create_sale IS
  'Crea venta + items + decremento de stock + eventos outbox en una sola transacción. Previene ventas huérfanas y sobreventa.';
