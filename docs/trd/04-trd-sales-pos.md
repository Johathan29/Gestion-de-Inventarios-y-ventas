# TRD: Sales & POS Service

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (3000)                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              sale-service (3007)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Sale     │ │ POS      │ │ Payment  │ │ Cash      │  │
│  │ Handler  │ │ Handler  │ │ Handler  │ │ Register  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │             │            │              │        │
│  ┌────▼─────────────▼────────────▼──────────────▼─────┐ │
│  │              Sale Domain Services                   │ │
│  │  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ SaleService  │  │ PaymentSvc   │                │ │
│  │  │ (CRUD, state)│  │ (validation) │                │ │
│  │  └──────────────┘  └──────────────┘                │ │
│  │  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ CashRegSvc   │  │ TicketSvc    │                │ │
│  │  │ (open/close) │  │ (PDF gen)    │                │ │
│  │  └──────────────┘  └──────────────┘                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 2. Sale Creation Flow

```typescript
async function createSale(data: CreateSaleDTO, userId: string): Promise<Sale> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Validate & calculate prices from catalog (BACKEND ONLY)
    const items = await calculateSaleItems(client, data.items);
    
    // 2. Calculate taxes and totals
    const totals = calculateSaleTotals(items, data.discount, data.taxRate);
    
    // 3. Insert sale
    const sale = await client.query(`
      INSERT INTO sales (
        client_id, user_id, status, subtotal, tax_amount, 
        discount_amount, total, notes, company_id, branch_id
      ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.client_id, userId, totals.subtotal, totals.tax,
      totals.discount, totals.total, data.notes,
      data.company_id, data.branch_id
    ]);
    
    // 4. Insert sale items
    for (const item of items) {
      await client.query(`
        INSERT INTO sale_items (
          sale_id, product_id, quantity, unit_price, 
          discount, tax_rate, subtotal, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        sale.rows[0].id, item.product_id, item.quantity,
        item.unit_price, item.discount, item.tax_rate,
        item.subtotal, userId
      ]);
    }
    
    // 5. Insert payments
    for (const payment of data.payments) {
      await client.query(`
        INSERT INTO sale_payments (
          sale_id, payment_method_id, amount, reference, notes
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        sale.rows[0].id, payment.method_id, payment.amount,
        payment.reference, payment.notes
      ]);
    }
    
    // 6. Publish event via outbox
    await client.query(`
      INSERT INTO transactional_outbox (aggregate_type, aggregate_id, event_type, payload)
      VALUES ('Sale', $1, 'SaleCreated', $2)
    `, [sale.rows[0].id, JSON.stringify({
      sale_id: sale.rows[0].id,
      client_id: data.client_id,
      total: totals.total,
      items_count: items.length
    })]);
    
    await client.query('COMMIT');
    return sale.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## 3. State Machine Implementation

```typescript
const SALE_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'completed', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  completed: [],  // terminal
  cancelled: []   // terminal
};

async function transitionSale(saleId: string, newStatus: string, userId: string): Promise<void> {
  const sale = await getSaleById(saleId);
  
  if (!SALE_TRANSITIONS[sale.status]?.includes(newStatus)) {
    throw new InvalidTransitionError(sale.status, newStatus);
  }
  
  await db.query(`
    UPDATE sales SET status = $1, updated_at = NOW() WHERE id = $2
  `, [newStatus, saleId]);
  
  // Side effects per transition
  switch (newStatus) {
    case 'confirmed':
      // Reserve/deduct stock
      await inventoryService.deductStockForSale(saleId);
      break;
    case 'cancelled':
      // Release reserved stock
      await inventoryService.releaseStockForSale(saleId);
      break;
  }
}
```

## 4. Cash Register Session

```typescript
async function openCashRegister(cashRegisterId: string, initialAmount: number, userId: string) {
  // Validate no open session
  const existing = await db.query(`
    SELECT id FROM cash_register_sessions 
    WHERE cash_register_id = $1 AND status = 'open'
  `, [cashRegisterId]);
  
  if (existing.rows.length > 0) {
    throw new Error('Ya existe una sesión abierta para esta caja');
  }
  
  return db.query(`
    INSERT INTO cash_register_sessions (cash_register_id, user_id, initial_amount, status)
    VALUES ($1, $2, $3, 'open')
    RETURNING *
  `, [cashRegisterId, userId, initialAmount]);
}

async function closeCashRegister(sessionId: string, finalCount: number, userId: string) {
  const session = await db.query(`
    SELECT * FROM cash_register_sessions WHERE id = $1 AND status = 'open'
  `, [sessionId]);
  
  if (session.rows.length === 0) {
    throw new Error('Sesión no encontrada o ya cerrada');
  }
  
  const movements = await db.query(`
    SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net
    FROM cash_movements WHERE session_id = $1
  `, [sessionId]);
  
  const expectedBalance = session.rows[0].initial_amount + (movements.rows[0].net || 0);
  const difference = finalCount - expectedBalance;
  
  await db.query(`
    UPDATE cash_register_sessions 
    SET status = 'closed', final_amount = $1, difference = $2, 
        closed_at = NOW(), closed_by = $3
    WHERE id = $4
  `, [finalCount, difference, userId, sessionId]);
  
  return { expectedBalance, actualCount: finalCount, difference };
}
```

## 5. POS Optimizations

| Optimization | Implementation |
|-------------|----------------|
| Product lookup by barcode | Index on products.barcode |
| Quick-add by SKU | Index on products.sku |
| Cart in memory | Frontend Pinia store |
| Sync on confirm | Single transaction |
| Offline queue | IndexedDB → sync when online |
