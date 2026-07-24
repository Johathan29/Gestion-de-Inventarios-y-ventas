-- ============================================================
-- MIGRACIÓN: Tablas de Caja Registradora (POS)
-- Instrucciones: Copia TODO este SQL en el Editor SQL de 
-- Supabase Dashboard (https://supabase.com/dashboard/project/prspnfxfspokbqxsboby/sql/new) 
-- y haz clic en "RUN" o "Ejecutar".
-- ============================================================

-- ============================================================
-- 1. CASH REGISTERS (Cajas Registradoras)
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    branch_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Insertar caja por defecto si no existe
INSERT INTO cash_registers (id, name, code, is_active)
SELECT '00000000-0000-0000-0000-000000000001', 'Caja Principal', 'CAJA-001', true
WHERE NOT EXISTS (SELECT 1 FROM cash_registers WHERE id = '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- 2. CASH REGISTER SESSIONS (Turnos / Sesiones de Caja)
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_register_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
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

-- ============================================================
-- 3. CASH MOVEMENTS (Movimientos de Caja)
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
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
-- 4. TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cash_registers_updated_at') THEN
        CREATE TRIGGER trg_cash_registers_updated_at
            BEFORE UPDATE ON cash_registers
            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cash_register_sessions_updated_at') THEN
        CREATE TRIGGER trg_cash_register_sessions_updated_at
            BEFORE UPDATE ON cash_register_sessions
            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
END;
$$;

-- ============================================================
-- 5. FUNCIÓN: Abrir sesión de caja
-- ============================================================
CREATE OR REPLACE FUNCTION fn_open_cash_session(
    p_register_id UUID,
    p_user_id UUID,
    p_opening_balance DECIMAL DEFAULT 0,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_session_id UUID;
    v_session RECORD;
BEGIN
    -- Verificar que no haya sesión abierta para este usuario
    IF EXISTS (
        SELECT 1 FROM cash_register_sessions
        WHERE user_id = p_user_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION 'El usuario ya tiene una sesión de caja abierta';
    END IF;

    -- Verificar que no haya sesión abierta para esta caja
    IF EXISTS (
        SELECT 1 FROM cash_register_sessions
        WHERE register_id = p_register_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION 'La caja registradora ya tiene una sesión abierta';
    END IF;

    -- Crear la sesión
    INSERT INTO cash_register_sessions (register_id, user_id, opening_balance, notes)
    VALUES (p_register_id, p_user_id, p_opening_balance, p_notes)
    RETURNING * INTO v_session;

    RETURN row_to_jsonb(v_session);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. FUNCIÓN: Cerrar sesión de caja
-- ============================================================
CREATE OR REPLACE FUNCTION fn_close_cash_session(
    p_session_id UUID,
    p_closing_balance DECIMAL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_expected DECIMAL;
    v_difference DECIMAL;
BEGIN
    -- Obtener la sesión
    SELECT * INTO v_session FROM cash_register_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión de caja no encontrada';
    END IF;
    IF v_session.status != 'open' THEN
        RAISE EXCEPTION 'La sesión de caja no está abierta';
    END IF;

    -- Calcular balance esperado: saldo inicial + ventas - retiros
    SELECT COALESCE(SUM(
        CASE WHEN type = 'sale' THEN amount
             WHEN type = 'deposit' THEN amount
             WHEN type IN ('withdrawal', 'refund', 'expense') THEN -amount
             ELSE 0 END
    ), 0) INTO v_expected
    FROM cash_movements
    WHERE session_id = p_session_id;

    v_expected := v_session.opening_balance + v_expected;
    v_difference := p_closing_balance - v_expected;

    -- Actualizar sesión
    UPDATE cash_register_sessions
    SET closing_balance = p_closing_balance,
        expected_balance = v_expected,
        difference = v_difference,
        closed_at = NOW(),
        status = 'closed',
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_session_id
    RETURNING * INTO v_session;

    RETURN row_to_jsonb(v_session);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
