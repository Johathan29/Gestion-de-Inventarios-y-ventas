-- ============================================================
-- MIGRATION 026: Enterprise Audit Improvements
-- Descripción: Índices faltantes, soft delete, columnas de auditoría,
--   preparación multi-empresa, lotes, seriales, reservas inventario,
--   costo FIFO, cupones, wishlist, caja registradora
-- ============================================================

BEGIN;

-- ============================================================
-- PARTE 1: ÍNDICES FALTANTES (Rendimiento)
-- ============================================================

-- Índices compuestos para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_sales_company_created ON sales(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_client_status ON sales(client_id, status);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_product_status ON inventory(product_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_warehouse ON inventory_movements(product_id, warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_status ON purchases(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_status ON invoices(client_id, status);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_source ON sales(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_verification ON purchases(verification_status, created_at DESC);

-- ============================================================
-- PARTE 2: SOFT DELETE Y AUDITORÍA
-- ============================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar quién modificó un registro
CREATE OR REPLACE FUNCTION set_audit_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_by = COALESCE(NEW.created_by, current_setting('app.current_user_id', true)::UUID);
    END IF;
    IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
        NEW.updated_by = COALESCE(NEW.updated_by, current_setting('app.current_user_id', true)::UUID);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Agregar columnas de auditoría a tablas principales (seguro, con IF NOT EXISTS)
DO $$
DECLARE
    tables_to_audit TEXT[] := ARRAY[
        'products', 'product_variants', 'categories', 'inventory', 'inventory_movements',
        'suppliers', 'purchases', 'purchase_items', 'sales', 'sale_items',
        'invoices', 'clients', 'offers', 'ecommerce_banners', 'hero_slides',
        'floating_banners', 'product_reviews', 'ecommerce_settings'
    ];
    t TEXT;
    col_exists BOOLEAN;
BEGIN
    FOREACH t IN ARRAY tables_to_audit
    LOOP
        -- Verificar si la tabla existe
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t) THEN
            -- created_by
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'created_by') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL', t);
            END IF;
            -- updated_by
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'updated_by') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL', t);
            END IF;
            -- deleted_at (soft delete)
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'deleted_at') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL', t);
            END IF;
            -- deleted_by
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'deleted_by') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL', t);
            END IF;
            -- updated_at trigger
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'updated_at') THEN
                IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = format('trg_%s_updated_at', t)) THEN
                    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================
-- PARTE 3: PREPARACIÓN MULTI-EMPRESA
-- ============================================================

DO $$
DECLARE
    tables_multi TEXT[] := ARRAY[
        'products', 'product_variants', 'categories', 'inventory', 'inventory_movements',
        'suppliers', 'purchases', 'purchase_items', 'sales', 'sale_items',
        'invoices', 'clients', 'offers', 'ecommerce_banners', 'hero_slides',
        'floating_banners', 'product_reviews', 'user_notifications'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables_multi
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t) THEN
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'company_id') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT ''00000000-0000-0000-0000-000000000001''', t);
                EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_company ON %I(company_id)', t, t);
            END IF;
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'branch_id') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN branch_id UUID DEFAULT NULL', t);
                EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_branch ON %I(branch_id)', t, t);
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================
-- PARTE 4: LOTES, SERIALES Y TRAZABILIDAD
-- ============================================================

-- Tabla de lotes
CREATE TABLE IF NOT EXISTS inventory_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    lot_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    manufacturing_date DATE,
    expiry_date DATE,
    received_date DATE DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
    unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'blocked', 'depleted')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lots_product ON inventory_lots(product_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_lots_supplier ON inventory_lots(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lots_status ON inventory_lots(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lots_number_per_product ON inventory_lots(product_id, lot_number) WHERE deleted_at IS NULL;

-- Tabla de números de serie (trazabilidad unitaria)
CREATE TABLE IF NOT EXISTS inventory_serials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    serial_number VARCHAR(200) NOT NULL,
    lot_id UUID REFERENCES inventory_lots(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'blocked', 'returned', 'warranty')),
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
    warranty_start DATE,
    warranty_end DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_serials_number ON inventory_serials(serial_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_serials_product ON inventory_serials(product_id, status);
CREATE INDEX IF NOT EXISTS idx_serials_sale ON inventory_serials(sale_id);
CREATE INDEX IF NOT EXISTS idx_serials_client ON inventory_serials(client_id);

-- ============================================================
-- PARTE 5: RESERVAS DE INVENTARIO
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    warehouse VARCHAR(50) DEFAULT 'main',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('sale', 'order', 'transfer', 'production')),
    reference_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reservations_product ON inventory_reservations(product_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_reference ON inventory_reservations(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_reservations_expires ON inventory_reservations(status, expires_at) WHERE status = 'active';

-- Función para reservar inventario
CREATE OR REPLACE FUNCTION reserve_inventory(
    p_product_id UUID,
    p_quantity INTEGER,
    p_reference_type VARCHAR,
    p_reference_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_warehouse VARCHAR DEFAULT 'main'
) RETURNS UUID AS $$
DECLARE
    v_available INTEGER;
    v_reservation_id UUID;
BEGIN
    -- Obtener stock disponible
    SELECT COALESCE(stock, 0) INTO v_available
    FROM inventory
    WHERE product_id = p_product_id AND warehouse = p_warehouse
    FOR UPDATE;

    -- Verificar disponibilidad
    IF v_available < p_quantity THEN
        RAISE EXCEPTION 'Stock insuficiente: disponible %, requerido %', v_available, p_quantity;
    END IF;

    -- Crear reserva
    INSERT INTO inventory_reservations (product_id, variant_id, warehouse, quantity, reference_type, reference_id)
    VALUES (p_product_id, p_variant_id, p_warehouse, p_quantity, p_reference_type, p_reference_id)
    RETURNING id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para liberar reserva
CREATE OR REPLACE FUNCTION release_reservation(p_reservation_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE inventory_reservations
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = p_reservation_id AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PARTE 6: COSTEO FIFO
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_fifo_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    warehouse VARCHAR(50) DEFAULT 'main',
    quantity INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    unit_cost DECIMAL(12,4) NOT NULL,
    purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
    purchase_item_id UUID REFERENCES purchase_items(id) ON DELETE SET NULL,
    lot_id UUID REFERENCES inventory_lots(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fifo_product ON inventory_fifo_layers(product_id, warehouse, received_at);
CREATE INDEX IF NOT EXISTS idx_fifo_remaining ON inventory_fifo_layers(product_id, warehouse) WHERE quantity_remaining > 0;

-- Función para registrar entrada FIFO
CREATE OR REPLACE FUNCTION fifo_add_layer(
    p_product_id UUID,
    p_quantity INTEGER,
    p_unit_cost DECIMAL,
    p_warehouse VARCHAR DEFAULT 'main',
    p_purchase_id UUID DEFAULT NULL,
    p_purchase_item_id UUID DEFAULT NULL,
    p_lot_id UUID DEFAULT NULL,
    p_variant_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_layer_id UUID;
BEGIN
    INSERT INTO inventory_fifo_layers (product_id, variant_id, warehouse, quantity, quantity_remaining, unit_cost, purchase_id, purchase_item_id, lot_id)
    VALUES (p_product_id, p_variant_id, p_warehouse, p_quantity, p_quantity, p_unit_cost, p_purchase_id, p_purchase_item_id, p_lot_id)
    RETURNING id INTO v_layer_id;

    -- Actualizar costo promedio en inventory
    UPDATE inventory
    SET
        avg_cost = (
            SELECT COALESCE(SUM(quantity_remaining * unit_cost) / NULLIF(SUM(quantity_remaining), 0), 0)
            FROM inventory_fifo_layers
            WHERE product_id = p_product_id AND warehouse = p_warehouse AND quantity_remaining > 0
        ),
        updated_at = NOW()
    WHERE product_id = p_product_id AND warehouse = p_warehouse;

    RETURN v_layer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para consumir inventario FIFO
CREATE OR REPLACE FUNCTION fifo_consume(
    p_product_id UUID,
    p_quantity INTEGER,
    p_warehouse VARCHAR DEFAULT 'main'
) RETURNS TABLE(layer_id UUID, quantity_consumed INTEGER, unit_cost DECIMAL) AS $$
DECLARE
    v_remaining INTEGER := p_quantity;
    v_layer RECORD;
BEGIN
    FOR v_layer IN
        SELECT id, quantity_remaining, unit_cost
        FROM inventory_fifo_layers
        WHERE product_id = p_product_id AND warehouse = p_warehouse AND quantity_remaining > 0
        ORDER BY received_at ASC
    LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;

        IF v_layer.quantity_remaining >= v_remaining THEN
            UPDATE inventory_fifo_layers
            SET quantity_remaining = quantity_remaining - v_remaining
            WHERE id = v_layer.id;

            layer_id := v_layer.id;
            quantity_consumed := v_remaining;
            unit_cost := v_layer.unit_cost;
            RETURN NEXT;
            v_remaining := 0;
        ELSE
            UPDATE inventory_fifo_layers
            SET quantity_remaining = 0
            WHERE id = v_layer.id;

            layer_id := v_layer.id;
            quantity_consumed := v_layer.quantity_remaining;
            unit_cost := v_layer.unit_cost;
            RETURN NEXT;
            v_remaining := v_remaining - v_layer.quantity_remaining;
        END IF;
    END LOOP;

    IF v_remaining > 0 THEN
        RAISE WARNING 'FIFO: No hay suficiente inventario para consumir % unidades de %', p_quantity, p_product_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PARTE 7: CAJA REGISTRADORA (POS)
-- ============================================================

CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    name VARCHAR(100) NOT NULL,
    branch_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cash_register_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(12,2),
    expected_balance DECIMAL(12,2),
    difference DECIMAL(12,2),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_register ON cash_register_sessions(register_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user ON cash_register_sessions(user_id, opened_at DESC);

CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    session_id UUID NOT NULL REFERENCES cash_register_sessions(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'withdrawal', 'deposit', 'refund', 'expense', 'transfer')),
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'transfer', 'credit', 'check', 'mixed')),
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(type, created_at DESC);

-- ============================================================
-- PARTE 8: CUPONES Y PROMOCIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
    discount_value DECIMAL(12,2) NOT NULL,
    min_purchase_amount DECIMAL(12,2) DEFAULT 0,
    max_discount_amount DECIMAL(12,2),
    usage_limit INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'specific_products', 'specific_categories')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, expires_at) WHERE is_active = true;

-- Productos específicos para cupón
CREATE TABLE IF NOT EXISTS coupon_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(coupon_id, product_id)
);

-- Categorías específicas para cupón
CREATE TABLE IF NOT EXISTS coupon_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(coupon_id, category_id)
);

-- Uso de cupón por cliente
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    discount_amount DECIMAL(12,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_client ON coupon_usage(client_id, coupon_id);

-- Promociones (2x1, 3x2, etc.)
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'buy_x_get_y', 'buy_x_get_discount', 'bundle', 'volume_discount',
        'free_gift', 'category_discount', 'flash_sale'
    )),
    buy_quantity INTEGER,
    get_quantity INTEGER,
    discount_percentage DECIMAL(5,2),
    discount_amount DECIMAL(12,2),
    max_applications INTEGER,
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active, starts_at, expires_at) WHERE is_active = true;

-- Productos en promoción
CREATE TABLE IF NOT EXISTS promotion_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    discount_percentage DECIMAL(5,2),
    UNIQUE(promotion_id, product_id)
);

-- ============================================================
-- PARTE 9: WISHLIST (LISTA DE DESEOS)
-- ============================================================

CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_client ON wishlist_items(client_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlist_items(product_id);

-- ============================================================
-- PARTE 10: NOTA DE CRÉDITO Y DEVOLUCIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    credit_note_number VARCHAR(50) UNIQUE NOT NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'applied', 'cancelled')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_sale ON credit_notes(sale_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_client ON credit_notes(client_id);

CREATE TABLE IF NOT EXISTS credit_note_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    reason TEXT
);

-- ============================================================
-- PARTE 11: DASHBOARD RPC OPTIMIZADO
-- ============================================================

CREATE OR REPLACE FUNCTION fn_get_dashboard_stats(
    p_company_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'sales_today', COALESCE((
            SELECT SUM(total) FROM sales
            WHERE company_id = p_company_id
            AND status = 'completed'
            AND created_at >= CURRENT_DATE
            AND deleted_at IS NULL
        ), 0),
        'sales_month', COALESCE((
            SELECT SUM(total) FROM sales
            WHERE company_id = p_company_id
            AND status = 'completed'
            AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
            AND deleted_at IS NULL
        ), 0),
        'sales_count_month', COALESCE((
            SELECT COUNT(*) FROM sales
            WHERE company_id = p_company_id
            AND status = 'completed'
            AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
            AND deleted_at IS NULL
        ), 0),
        'low_stock_count', COALESCE((
            SELECT COUNT(*) FROM inventory i
            JOIN products p ON p.id = i.product_id
            WHERE i.company_id = p_company_id
            AND i.stock <= p.min_stock
            AND i.deleted_at IS NULL
        ), 0),
        'total_products', COALESCE((
            SELECT COUNT(*) FROM products
            WHERE company_id = p_company_id
            AND is_active = true
            AND deleted_at IS NULL
        ), 0),
        'total_clients', COALESCE((
            SELECT COUNT(*) FROM clients
            WHERE company_id = p_company_id
            AND deleted_at IS NULL
        ), 0),
        'total_users', COALESCE((
            SELECT COUNT(*) FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE u.deleted_at IS NULL
        ), 0),
        'pending_verifications', COALESCE((
            SELECT COUNT(*) FROM purchases
            WHERE company_id = p_company_id
            AND verification_status = 'pending'
            AND deleted_at IS NULL
        ), 0),
        'sales_chart', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'date', d::DATE,
                'total', COALESCE(SUM(s.total), 0)
            ) ORDER BY d)
            FROM generate_series(
                GREATEST(p_start_date, CURRENT_DATE - INTERVAL '30 days'),
                p_end_date,
                '1 day'
            ) d
            LEFT JOIN sales s ON DATE(s.created_at) = d::DATE
                AND s.company_id = p_company_id
                AND s.status = 'completed'
                AND s.deleted_at IS NULL
            GROUP BY d
        ), '[]'::JSONB),
        'top_products', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'name', p.name,
                'total', SUM(si.subtotal),
                'quantity', SUM(si.quantity)
            ) ORDER BY SUM(si.quantity) DESC LIMIT 10)
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            JOIN products p ON p.id = si.product_id
            WHERE s.company_id = p_company_id
            AND s.status = 'completed'
            AND s.created_at >= p_start_date
            AND s.deleted_at IS NULL
        ), '[]'::JSONB),
        'recent_sales', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', s.id,
                'sale_number', s.sale_number,
                'client_name', c.name,
                'total', s.total,
                'created_at', s.created_at
            ) ORDER BY s.created_at DESC LIMIT 10)
            FROM sales s
            LEFT JOIN clients c ON c.id = s.client_id
            WHERE s.company_id = p_company_id
            AND s.deleted_at IS NULL
        ), '[]'::JSONB)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- PARTE 12: SEGURIDAD — RLS POLICIES
-- ============================================================

-- Habilitar RLS en tablas principales
DO $$
DECLARE
    rls_tables TEXT[] := ARRAY[
        'products', 'product_variants', 'categories', 'inventory', 'inventory_movements',
        'suppliers', 'purchases', 'purchase_items', 'sales', 'sale_items',
        'invoices', 'clients', 'offers', 'coupons', 'promotions',
        'inventory_lots', 'inventory_serials', 'inventory_reservations',
        'wishlist_items', 'credit_notes', 'cash_register_sessions', 'cash_movements'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY rls_tables
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        END IF;
    END LOOP;
END;
$$;

-- Política base: acceso por company_id
DO $$
DECLARE
    rls_tables TEXT[] := ARRAY[
        'products', 'product_variants', 'categories', 'inventory', 'inventory_movements',
        'suppliers', 'purchases', 'purchase_items', 'sales', 'sale_items',
        'invoices', 'offers', 'coupons', 'promotions',
        'inventory_lots', 'inventory_serials', 'inventory_reservations'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY rls_tables
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t) THEN
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS company_access ON %I', t);
                EXECUTE format('
                    CREATE POLICY company_access ON %I
                    FOR ALL
                    USING (company_id = current_setting(''app.current_company_id'', true)::UUID)
                    WITH CHECK (company_id = current_setting(''app.current_company_id'', true)::UUID)
                ', t);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not create RLS policy for %: %', t, SQLERRM;
            END;
        END IF;
    END LOOP;
END;
$$;

-- Política para clientes: solo ven sus propios datos
DROP POLICY IF EXISTS client_access ON sales;
CREATE POLICY client_access ON sales
    FOR SELECT
    USING (
        client_id IN (
            SELECT id FROM clients WHERE user_id = current_setting('app.current_user_id', true)::UUID
        )
    );

DROP POLICY IF EXISTS client_access ON wishlist_items;
CREATE POLICY client_access ON wishlist_items
    FOR ALL
    USING (client_id IN (
        SELECT id FROM clients WHERE user_id = current_setting('app.current_user_id', true)::UUID
    ));

-- ============================================================
-- PARTE 13: MÉTODOS DE PAGO MÚLTIPLES EN VENTAS
-- ============================================================

CREATE TABLE IF NOT EXISTS sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'credit', 'check', 'wallet', 'mixed')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    reference_number VARCHAR(100),
    card_last_four VARCHAR(4),
    bank_name VARCHAR(100),
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_method ON sale_payments(payment_method, processed_at DESC);

-- ============================================================
-- PARTE 14: HISTORIAL DE PRECIOS DE PRODUCTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS product_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL CHECK (field_name IN ('price', 'cost', 'compare_price', 'min_price', 'max_price')),
    old_value DECIMAL(12,2),
    new_value DECIMAL(12,2) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_variant ON product_price_history(variant_id, created_at DESC);

-- ============================================================
-- PARTE 15: ACTUALIZAR updated_at EN TABLAS NUEVAS
-- ============================================================

DO $$
DECLARE
    new_tables TEXT[] := ARRAY[
        'inventory_lots', 'inventory_serials', 'inventory_reservations',
        'cash_registers', 'cash_register_sessions', 'coupons',
        'promotions', 'credit_notes', 'inventory_fifo_layers'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY new_tables
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t)
           AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'updated_at') THEN
            IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = format('trg_%s_updated_at', t)) THEN
                EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================
-- PARTE 16: NOTIFICACIONES PARA NUEVOS EVENTOS
-- ============================================================

CREATE OR REPLACE FUNCTION notify_coupon_used()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_notifications (user_id, type, title, message, reference_type, reference_id)
    SELECT
        u.id,
        'info',
        'Cupón utilizado',
        format('El cupón %s fue utilizado en la venta %s',
            (SELECT code FROM coupons WHERE id = NEW.coupon_id),
            (SELECT sale_number FROM sales WHERE id = NEW.sale_id)
        ),
        'coupon',
        NEW.id
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.name IN ('admin', 'supervisor');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_coupon_used ON coupon_usage;
CREATE TRIGGER trg_notify_coupon_used AFTER INSERT ON coupon_usage
FOR EACH ROW EXECUTE FUNCTION notify_coupon_used();

-- ============================================================
-- PARTE 17: VISTA MATERIALIZADA PARA DASHBOARD
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_summary AS
SELECT
    '00000000-0000-0000-0000-000000000001'::UUID AS company_id,
    COALESCE(SUM(CASE WHEN s.created_at >= CURRENT_DATE AND s.status = 'completed' THEN s.total ELSE 0 END), 0) AS sales_today,
    COALESCE(SUM(CASE WHEN s.created_at >= DATE_TRUNC('month', CURRENT_DATE) AND s.status = 'completed' THEN s.total ELSE 0 END), 0) AS sales_month,
    COALESCE(COUNT(CASE WHEN s.created_at >= DATE_TRUNC('month', CURRENT_DATE) AND s.status = 'completed' THEN 1 END), 0) AS sales_count_month,
    COALESCE(SUM(CASE WHEN s.created_at >= CURRENT_DATE - INTERVAL '30 days' AND s.status = 'completed' THEN s.total ELSE 0 END), 0) AS sales_30days
FROM sales s
WHERE s.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_company ON mv_dashboard_summary(company_id);

CREATE OR REPLACE FUNCTION refresh_dashboard_summary()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_refresh_dashboard_sales ON sales;
CREATE TRIGGER trg_refresh_dashboard_sales
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_summary();

-- ============================================================
-- PARTE 18: FUNCIÓN PARA GENERAR NÚMERO DE NOTA DE CRÉDITO
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS seq_credit_note_number START 1;

CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year VARCHAR(4) := TO_CHAR(NOW(), 'YYYY');
    v_seq BIGINT;
BEGIN
    v_seq := NEXTVAL('seq_credit_note_number');
    RETURN 'CN-' || v_year || '-' || LPAD(v_seq::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PARTE 19: CONFIGURACIONES DE SEGURIDAD Y SISTEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS system_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_config_company ON system_configurations(company_id);

-- Insertar configuraciones por defecto
INSERT INTO system_configurations (config_key, config_value, description) VALUES
('security.password_policy', '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_special_chars": false, "max_age_days": 90}', 'Política de contraseñas'),
('security.session', '{"jwt_expiry_minutes": 60, "refresh_expiry_days": 7, "max_concurrent_sessions": 5, "inactivity_timeout_minutes": 30}', 'Configuración de sesiones'),
('security.login_policy', '{"max_attempts": 5, "lockout_minutes": 15, "require_2fa": false, "notify_new_device": true}', 'Política de inicio de sesión'),
('ecommerce.general', '{"enable_wishlist": true, "enable_coupons": false, "enable_reviews": true, "max_review_length": 1000}', 'Configuración general del ecommerce'),
('inventory.general', '{"enable_lots": false, "enable_serials": false, "enable_fifo": false, "enable_reservations": false, "low_stock_threshold": 10}', 'Configuración de inventario'),
('pos.general', '{"enable_cash_register": false, "enable_multi_payment": true, "enable_credit_notes": false, "default_payment_method": "cash"}', 'Configuración del POS')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- PARTE 20: HISTORIAL DE INVENTARIO (AUDITORÍA MEJORADA)
-- ============================================================

-- Función mejorada para movimientos con costos y referencias
CREATE OR REPLACE FUNCTION record_inventory_movement(
    p_product_id UUID,
    p_warehouse VARCHAR,
    p_quantity INTEGER,
    p_type VARCHAR,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_unit_cost DECIMAL DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_company_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    p_variant_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_movement_id UUID;
BEGIN
    INSERT INTO inventory_movements (
        company_id, product_id, variant_id, warehouse, quantity,
        type, reference_type, reference_id, unit_cost, notes
    ) VALUES (
        p_company_id, p_product_id, p_variant_id, p_warehouse, p_quantity,
        p_type, p_reference_type, p_reference_id, p_unit_cost, p_notes
    ) RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
