# Event Model: Transactional Outbox Pattern

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Event-Driven Architecture                 │
│                                                              │
│  ┌──────────┐     ┌────────────────┐     ┌───────────────┐  │
│  │ Service  │────▶│ transactional  │────▶│ Outbox Worker │  │
│  │ (write   │     │ outbox table   │     │ (polling)     │  │
│  │  event)  │     │ (same DB tx)   │     │               │  │
│  └──────────┘     └────────────────┘     └───────┬───────┘  │
│                                                   │          │
│                                          ┌────────▼───────┐  │
│                                          │  Event Bus     │  │
│                                          │  (Redis Pub/   │  │
│                                          │   Supabase)    │  │
│                                          └────────┬───────┘  │
│                                          ┌────────▼───────┐  │
│                                          │  Consumers     │  │
│                                          │  ┌───────────┐ │  │
│                                          │  │ notification│ │  │
│                                          │  │ audit      │ │  │
│                                          │  │ accounting │ │  │
│                                          │  │ ecommerce  │ │  │
│                                          │  └───────────┘ │  │
│                                          └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 2. Outbox Table

```sql
CREATE TABLE transactional_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'published', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_outbox_status ON transactional_outbox(status, next_retry_at);
CREATE INDEX idx_outbox_aggregate ON transactional_outbox(aggregate_type, aggregate_id);
```

## 3. Outbox Worker

```typescript
async function processOutbox() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Lock rows for processing (skip locked by other workers)
    const events = await client.query(`
      SELECT * FROM transactional_outbox
      WHERE status = 'pending'
        AND attempts < max_attempts
        AND next_retry_at <= NOW()
      ORDER BY created_at ASC
      LIMIT 100
      FOR UPDATE SKIP LOCKED
    `);
    
    for (const event of events.rows) {
      try {
        // Mark as processing
        await client.query(`
          UPDATE transactional_outbox SET status = 'processing', attempts = attempts + 1
          WHERE id = $1
        `, [event.id]);
        
        // Publish to event bus
        await eventBus.publish(event.event_type, {
          id: event.id,
          aggregate_type: event.aggregate_type,
          aggregate_id: event.aggregate_id,
          payload: event.payload,
          metadata: {
            ...event.metadata,
            correlation_id: generateCorrelationId(),
            timestamp: new Date().toISOString()
          }
        });
        
        // Mark as published
        await client.query(`
          UPDATE transactional_outbox 
          SET status = 'published', published_at = NOW() 
          WHERE id = $1
        `, [event.id]);
        
      } catch (error) {
        // Exponential backoff
        const delay = Math.pow(2, event.attempts) * 1000; // 1s, 2s, 4s, 8s, 16s
        const newStatus = event.attempts + 1 >= event.max_attempts ? 'failed' : 'pending';
        
        await client.query(`
          UPDATE transactional_outbox 
          SET status = $1, 
              next_retry_at = NOW() + $2 * INTERVAL '1 millisecond',
              metadata = metadata || $3::jsonb
          WHERE id = $4
        `, [newStatus, delay, JSON.stringify({ last_error: error.message }), event.id]);
      }
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

// Run every 5 seconds
setInterval(processOutbox, 5000);
```

## 4. Event Catalog

### Identity Events
| Event | Producer | Consumers | Payload |
|-------|----------|-----------|---------|
| `UserCreated` | identity-service | email, audit | user data |
| `UserUpdated` | identity-service | audit | changes |
| `UserDeactivated` | identity-service | notification, audit | user_id, reason |
| `LoginSuccess` | identity-service | audit | user_id, ip |
| `LoginFailed` | identity-service | audit | email, ip, reason |

### Catalog Events
| Event | Producer | Consumers | Payload |
|-------|----------|-----------|---------|
| `ProductCreated` | catalog-service | inventory, ecommerce | product data |
| `ProductUpdated` | catalog-service | ecommerce | changes |
| `PriceChanged` | catalog-service | audit | old_price, new_price |

### Inventory Events
| Event | Producer | Consumers | Payload |
|-------|----------|-----------|---------|
| `StockReceived` | inventory-service | purchase (confirm) | product, qty, warehouse |
| `StockAdjusted` | inventory-service | audit | adjustment details |
| `StockTransferred` | inventory-service | audit | from, to, qty |
| `LowStockDetected` | inventory-service | notification | product, current_stock |
| `StockReserved` | inventory-service | sale, checkout | reservation_id |
| `StockReleased` | inventory-service | sale, checkout | reservation_id |

### Sales Events
| Event | Producer | Consumers | Payload |
|-------|----------|-----------|---------|
| `SaleCreated` | sale-service | inventory (reserve), notification | sale data |
| `SaleConfirmed` | sale-service | inventory (deduct), accounting | sale_id |
| `SaleCompleted` | sale-service | accounting, notification | sale_id |
| `SaleCancelled` | sale-service | inventory (release), accounting | sale_id, reason |
| `PaymentReceived` | sale-service | accounting, notification | payment data |

### Procurement Events
| Event | Producer | Consumers | Payload |
|-------|----------|-----------|---------|
| `PurchaseCreated` | purchase-service | audit | purchase data |
| `PurchaseReceived` | purchase-service | inventory (receipt) | receipt data |
| `QualityInspected` | purchase-service | audit, inventory | inspection result |

### Invoice Events
| Event | Producer | Consumers | Payload |
|-------|----------|-----------|---------|
| `InvoiceCreated` | invoice-service | notification (email PDF) | invoice data |
| `CreditNoteIssued` | invoice-service | accounting, audit | credit note data |

### Accounting Events
| Event | Producer | Consumers | Payload |
|-------|----------|-----------|---------|
| `EntryPosted` | accounting-service | audit | entry data |

## 5. Event Schema (CloudEvents-inspired)

```typescript
interface DomainEvent {
  id: string;                    // Event UUID
  type: string;                  // e.g., "SaleCreated"
  source: string;                // e.g., "sale-service"
  aggregate_type: string;        // e.g., "Sale"
  aggregate_id: string;          // e.g., sale UUID
  timestamp: string;             // ISO 8601
  correlation_id: string;        // Request tracing
  payload: Record<string, any>;  // Event-specific data
  metadata: {
    version: string;             // "1.0"
    produced_by: string;         // Service name
    company_id?: string;         // Multi-tenant scope
  };
}
```

## 6. Cleanup Job

```typescript
// Clean published events older than 30 days
async function cleanupOutbox() {
  await db.query(`
    DELETE FROM transactional_outbox 
    WHERE status = 'published' 
      AND published_at < NOW() - INTERVAL '30 days'
  `);
  
  // Archive failed events for manual review
  await db.query(`
    INSERT INTO outbox_archive 
    SELECT * FROM transactional_outbox 
    WHERE status = 'failed' AND attempts >= max_attempts
  `);
  
  await db.query(`
    DELETE FROM transactional_outbox 
    WHERE status = 'failed' AND attempts >= max_attempts
  `);
}
```
