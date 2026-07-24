# Esquema de Base de Datos — Sistema de Caja Registradora (POS)

## 📋 Tablas del Módulo de Caja

### 1. `cash_registers` — Cajas Registradoras (Tabla Permanente)

| Columna | Tipo | PK/FK | Restricciones | Descripción |
|---------|------|-------|---------------|-------------|
| `id` | UUID | **PK** | `DEFAULT gen_random_uuid()` | Identificador único |
| `company_id` | UUID | — | `DEFAULT '00000000-...'` | ID de compañía |
| `name` | VARCHAR(100) | — | `NOT NULL` | Nombre de la caja |
| `branch_id` | UUID | — | `DEFAULT NULL` | Sucursal |
| `is_active` | BOOLEAN | — | `DEFAULT true` | Estado activo/inactivo |
| `created_at` | TIMESTAMPTZ | — | `DEFAULT NOW()` | Fecha creación |
| `updated_at` | TIMESTAMPTZ | — | `DEFAULT NOW()` | Fecha actualización |
| `deleted_at` | TIMESTAMPTZ | — | `DEFAULT NULL` | Soft delete |

**🔑 Primary Key:** `id`  
**🔗 Foreign Keys:** Ninguna  
**⚡ Triggers:** `trg_cash_registers_updated_at` (actualiza `updated_at` automáticamente)  
**📌 Tipo:** **PERMANENTE** — Datos maestros, se crean una vez y persisten  

---

### 2. `cash_register_sessions` — Sesiones/Turnos de Caja (Tabla Temporal → Histórica)

| Columna | Tipo | PK/FK | Restricciones | Descripción |
|---------|------|-------|---------------|-------------|
| `id` | UUID | **PK** | `DEFAULT gen_random_uuid()` | Identificador único |
| `company_id` | UUID | — | `DEFAULT '00000000-...'` | ID de compañía |
| `register_id` | UUID | **FK → cash_registers(id)** | `NOT NULL, ON DELETE CASCADE` | Caja registradora |
| `user_id` | UUID | **FK → users(id)** | `NOT NULL, ON DELETE CASCADE` | Cajero responsable |
| `opening_balance` | DECIMAL(12,2) | — | `NOT NULL DEFAULT 0` | Saldo inicial |
| `closing_balance` | DECIMAL(12,2) | — | | Saldo final declarado |
| `expected_balance` | DECIMAL(12,2) | — | | Saldo esperado (calculado) |
| `difference` | DECIMAL(12,2) | — | | Diferencia (cierre - esperado) |
| `opened_at` | TIMESTAMPTZ | — | `DEFAULT NOW()` | Apertura |
| `closed_at` | TIMESTAMPTZ | — | | Cierre |
| `notes` | TEXT | — | | Notas / observaciones |
| `status` | VARCHAR(20) | — | `CHECK (IN ('open','closed','reconciled'))`, `DEFAULT 'open'` | Estado de la sesión |
| `created_at` | TIMESTAMPTZ | — | `DEFAULT NOW()` | |
| `updated_at` | TIMESTAMPTZ | — | `DEFAULT NOW()` | |

**🔑 Primary Key:** `id`  
**🔗 Foreign Keys:**
- `register_id` → `cash_registers(id)` (CASCADE)
- `user_id` → `users(id)` (CASCADE)  

**📊 Índices:**
- `idx_cash_sessions_register` ON `(register_id, status)`
- `idx_cash_sessions_user` ON `(user_id, opened_at DESC)`  

**⚡ Triggers:** `trg_cash_register_sessions_updated_at`  
**📌 Tipo:** **TEMPORAL → HISTÓRICA** — Las sesiones activas son datos temporales (turno actual). Al cerrarse pasan a ser datos históricos permanentes.

---

### 3. `cash_movements` — Movimientos de Caja (Tabla Histórica)

| Columna | Tipo | PK/FK | Restricciones | Descripción |
|---------|------|-------|---------------|-------------|
| `id` | UUID | **PK** | `DEFAULT gen_random_uuid()` | Identificador único |
| `company_id` | UUID | — | `DEFAULT '00000000-...'` | ID de compañía |
| `session_id` | UUID | **FK → cash_register_sessions(id)** | `NOT NULL, ON DELETE CASCADE` | Sesión de caja |
| `type` | VARCHAR(20) | — | `CHECK (IN ('sale','withdrawal','deposit','refund','expense','transfer'))`, `NOT NULL` | Tipo de movimiento |
| `amount` | DECIMAL(12,2) | — | `NOT NULL` | Monto |
| `payment_method` | VARCHAR(20) | — | `CHECK (IN ('cash','card','transfer','credit','check','mixed'))` | Método de pago |
| `reference_type` | VARCHAR(50) | — | | Tipo de referencia (e.g. 'sale') |
| `reference_id` | UUID | — | | ID de la referencia |
| `description` | TEXT | — | | Descripción |
| `created_by` | UUID | **FK → users(id)** | `ON DELETE SET NULL` | Quién lo creó |
| `created_at` | TIMESTAMPTZ | — | `DEFAULT NOW()` | |

**🔑 Primary Key:** `id`  
**🔗 Foreign Keys:**
- `session_id` → `cash_register_sessions(id)` (CASCADE)
- `created_by` → `users(id)` (SET NULL)  

**📊 Índices:**
- `idx_cash_movements_session` ON `(session_id)`
- `idx_cash_movements_type` ON `(type, created_at DESC)`  

**📌 Tipo:** **HISTÓRICA (PERMANENTE)** — Cada venta, retiro, depósito, etc. queda registrado permanentemente

---

## ⚙️ Funciones (Stored Procedures)

### `fn_open_cash_session(register_id, user_id, opening_balance, notes)`
- **Propósito:** Abrir un turno de caja
- **Validaciones:**
  1. El usuario no debe tener otra sesión abierta
  2. La caja no debe tener otra sesión abierta
- **Retorna:** `JSONB` con los datos de la sesión creada

### `fn_close_cash_session(session_id, closing_balance, notes)`
- **Propósito:** Cerrar un turno de caja
- **Cálculos:**
  1. Suma todos los movimientos de la sesión (ventas + depósitos - retiros - gastos - devoluciones)
  2. Calcula `expected_balance = opening_balance + total_movimientos`
  3. Calcula `difference = closing_balance - expected_balance`
- **Validaciones:** La sesión debe existir y estar en estado `'open'`
- **Retorna:** `JSONB` con los datos actualizados

---

## 🔄 Flujo de Datos

```
┌─────────────────┐
│  cash_registers  │  ← Permanente: cajas físicas/lógicas
│  (Tabla Maestra) │
└────────┬────────┘
         │ 1
         │
         ▼
┌─────────────────────────┐
│ cash_register_sessions   │  ← Temporal: turno activo
│  (Sesión/Turno)          │  → Histórico: turno cerrado
└────────┬────────────────┘
         │ 1
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│ Ventas  │ │ Movimientos │  ← cash_movements
│ (sales) │ │ (retiros,   │    Histórico permanente
└────────┘ │  depósitos,  │
           │  gastos,     │
           │  transfer.)  │
           └──────────────┘
```

## 📁 Tablas Temporales vs Permanentes

| Tabla | Tipo | Ciclo de Vida |
|-------|------|---------------|
| `cash_registers` | **PERMANENTE** | Se crean y persisten indefinidamente |
| `cash_register_sessions` (status='open') | **TEMPORAL** | Solo 1 sesión abierta por caja/usuario |
| `cash_register_sessions` (status='closed') | **HISTÓRICA** | Persiste para auditoría y reportes |
| `cash_movements` | **PERMANENTE** | Todos los movimientos quedan registrados |

---

## 📝 Notas Importantes

1. **Relación con Ventas:** Cada venta (`sales`) realizada durante un turno debe vincularse a la sesión mediante `cash_movements` con `type='sale'` y `reference_id = sales.id`
2. **Integridad:** Las FK con `ON DELETE CASCADE` aseguran que al eliminar una sesión se eliminen sus movimientos
3. **Auditoría:** `created_by` en `cash_movements` permite rastrear quién hizo cada movimiento
4. **Conteo de Caja:** Al cerrar turno, el sistema calcula automáticamente la diferencia entre el esperado y lo declarado
