# TRD: Inventory Management Service

## 1. Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (3000)                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│            inventory-service (3005)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Ledger   │ │ Stock    │ │ Transfer │ │ Physical  │  │
│  │ Service  │ │ Service  │ │ Service  │ │ Count     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │             │            │              │        │
│  ┌────▼─────────────▼────────────▼──────────────▼─────┐ │
│  │         Inventory Domain Layer                      │ │
│  │  ┌─────────────────────────────────────────────┐   │ │
│  │  │  inventory_ledger (append-only, immutable)  │   │ │
│  │  │  inventory_balances (materialized view)     │   │ │
│  │  │  inventory_reservations                     │   │ │
│  │  │  inventory_lots / inventory_serials         │   │ │
│  │  └─────────────────────────────────────────────┘   │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                  │
│  ┌────────────────────▼───────────────────────────────┐ │
│  │              Infrastructure Layer                   │ │
│  │  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ PostgreSQL   │  │ Event Bus    │                │ │
│  │  │ (ledger,     │  │ (outbox      │                │ │
│  │  │  balances)   │  │  pattern)    │                │ │
│  │  └──────────────┘  └──────────────┘                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 2. Core Data Flow: Inventory Movement

```
                    ┌───────────────┐
                    │ Request Entry │
                    │ (purchase,    │
                    │  adjustment,  │
                    │  return)      │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Validate      │
                    │ (product,     │
                    │  warehouse,   │
                    │  quantity)    │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ BEGIN TX      │
                    │               │
                    │ 1. INSERT     │
                    │    inventory_ │
                    │    ledger     │
                    │               │
                    │ 2. INSERT     │
                    │    inventory_ │
                    │    movements  │
                    │               │
                    │ 3. INSERT     │
                    │    outbox     │
                    │    event      │
                    │               │
                    │ COMMIT        │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Trigger fires │
                    │ (auto-balance │
                    │  calculation) │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Refresh       │
                    │ materialized  │
                    │ view          │
                    └───────────────┘
```

## 3. Inventory Ledger Schema

```sql
-- From MIGRATION 028 (complete)
CREATE TABLE inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  batch_id UUID,
  movement_type VARCHAR(50) NOT NULL
    CHECK (movement_type IN (
      'PURCHASE_RECEIPT', 'SALE', 'ADJUSTMENT_POSITIVE', 'ADJUSTMENT_NEGATIVE',
      'RETURN', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE_RETURN', 'PURCHASE_RETURN',
      'INVENTORY_COUNT', 'LOSS', 'DAMAGED', 'RESERVATION', 'OPENING', 'OTHER'
    )),
  quantity NUMERIC(12,4) NOT NULL,
  unit_cost DECIMAL(12,4) DEFAULT 0,
  total_cost DECIMAL(14,2) DEFAULT 0,
  reference_type VARCHAR(50),
  reference_id UUID,
  previous_balance NUMERIC(12,4) DEFAULT 0,
  new_balance NUMERIC(12,4) DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID REFERENCES companies(id),
  branch_id UUID
);

-- IMMUTABLE: NO UPDATE, NO DELETE triggers
CREATE TRIGGER prevent_delete ON inventory_ledger
  BEFORE DELETE ON inventory_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
```

## 4. Balance Calculation

```typescript
// Obtener balance actual de un producto en una bodega
async function getBalance(productId: string, warehouseId: string): Promise<number> {
  const result = await db.query(`
    SELECT new_balance
    FROM inventory_ledger
    WHERE product_id = $1 AND warehouse_id = $2
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `, [productId, warehouseId]);
  
  return result.rows[0]?.new_balance ?? 0;
}

// Obtener balance consolidado (todas las bodegas)
async function getTotalBalance(productId: string): Promise<number> {
  const result = await db.query(`
    SELECT SUM(new_balance) as total
    FROM inventory_ledger
    WHERE product_id = $1
    AND (product_id, warehouse_id, created_at) IN (
      SELECT product_id, warehouse_id, MAX(created_at)
      FROM inventory_ledger
      WHERE product_id = $1
      GROUP BY product_id, warehouse_id
    )
  `, [productId]);
  
  return result.rows[0]?.total ?? 0;
}
```

## 5. Atomic Transfer

```typescript
async function transferStock(
  productId: string,
  fromWarehouse: string,
  toWarehouse: string,
  quantity: number,
  userId: string,
  companyId: string
): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Validar stock suficiente en origen
    const balance = await getBalanceWithClient(client, productId, fromWarehouse);
    if (balance < quantity) {
      throw new InsufficientStockError(productId, fromWarehouse, quantity, balance);
    }
    
    // 2. Registro de salida (TRANSFER_OUT)
    await client.query(`
      INSERT INTO inventory_ledger (product_id, warehouse_id, movement_type, quantity, 
        reference_type, notes, created_by, company_id)
      VALUES ($1, $2, 'TRANSFER_OUT', $3, 'transfer', $4, $5, $6)
    `, [productId, fromWarehouse, quantity, `Transferencia a bodega destino`, userId, companyId]);
    
    // 3. Registro de entrada (TRANSFER_IN)
    await client.query(`
      INSERT INTO inventory_ledger (product_id, warehouse_id, movement_type, quantity,
        reference_type, notes, created_by, company_id)
      VALUES ($1, $2, 'TRANSFER_IN', $3, 'transfer', $4, $5, $6)
    `, [productId, toWarehouse, quantity, `Transferencia desde bodega origen`, userId, companyId]);
    
    // 4. Publicar evento
    await client.query(`
      INSERT INTO transactional_outbox (aggregate_type, aggregate_id, event_type, payload)
      VALUES ('Inventory', $1, 'StockTransferred', $2)
    `, [productId, JSON.stringify({
      product_id: productId,
      from_warehouse: fromWarehouse,
      to_warehouse: toWarehouse,
      quantity,
      transferred_by: userId
    })]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## 6. Reservation System

```typescript
// Reservar stock para una orden pendiente
async function reserveStock(
  productId: string,
  warehouseId: string,
  quantity: number,
  referenceType: string,
  referenceId: string,
  userId: string
): Promise<InventoryReservation> {
  // Verificar stock disponible
  const balance = await getBalance(productId, warehouseId);
  const reserved = await getReserved(productId, warehouseId);
  const available = balance - reserved;
  
  if (available < quantity) {
    throw new InsufficientStockError(productId, warehouseId, quantity, available);
  }
  
  // Crear reserva
  const result = await db.query(`
    INSERT INTO inventory_reservations 
      (product_id, warehouse_id, quantity, reference_type, reference_id, 
       status, expires_at, created_by)
    VALUES ($1, $2, $3, $4, $5, 'active', NOW() + INTERVAL '15 minutes', $6)
    RETURNING *
  `, [productId, warehouseId, quantity, referenceType, referenceId, userId]);
  
  return result.rows[0];
}
```

## 7. Stock Alert Cron

```typescript
// Ejecutar cada 5 minutos
async function checkLowStock(): Promise<void> {
  const result = await db.query(`
    SELECT 
      p.id as product_id,
      p.name,
      p.min_stock,
      COALESCE(ib.quantity, 0) as current_stock,
      w.name as warehouse_name
    FROM products p
    JOIN inventory i ON i.product_id = p.id
    JOIN warehouses w ON w.id = i.warehouse_id
    LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.warehouse_id = w.id
    WHERE p.is_active = true
      AND COALESCE(ib.quantity, 0) <= p.min_stock
      AND p.min_stock > 0
  `);
  
  for (const row of result.rows) {
    await publishOutboxEvent('Inventory', row.product_id, 'LowStockDetected', {
      product_id: row.product_id,
      product_name: row.name,
      current_stock: row.current_stock,
      min_stock: row.min_stock,
      warehouse: row.warehouse_name
    });
  }
}
```

## 8. Performance Considerations

| Operation | Target | Strategy |
|-----------|--------|----------|
| Get balance | < 10ms | Materialized view + index |
| Ledger query | < 50ms | Composite index (product_id, warehouse_id, created_at) |
| Transfer | < 200ms | Single transaction |
| Alert check | < 5s | Background cron job |
