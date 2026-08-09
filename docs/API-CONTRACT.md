# API Contract: REST API Standards

## 1. Base URL & Versioning

```
Production:  https://api.erp-domain.com/v1
Staging:     https://api-staging.erp-domain.com/v1
Local:       http://localhost:3000/v1
```

## 2. Global Standards

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <access_token>
X-Request-ID: <uuid>           // Correlation ID
X-Company-ID: <uuid>           // Multi-tenant scope
X-Idempotency-Key: <uuid>      // For write operations
```

### Response Format

```json
// Success (single)
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}

// Success (list with pagination)
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "has_next": true,
    "has_prev": false,
    "cursor": "eyJpZCI6..."
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email already exists",
    "details": [
      { "field": "email", "message": "Already registered" }
    ]
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Validation Error |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, state conflict) |
| 422 | Unprocessable Entity (business rule) |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `DUPLICATE_ENTRY` | Resource already exists |
| `STATE_CONFLICT` | Invalid state transition |
| `INSUFFICIENT_STOCK` | Not enough inventory |
| `PAYMENT_FAILED` | Payment processing error |
| `RATE_LIMITED` | Too many requests |
| `IDEMPOTENCY_KEY_REUSED` | Different payload with same key |

## 3. Authentication API

### POST /v1/auth/login
```typescript
// Request
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response 200
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "admin",
      "company_id": "uuid",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

### POST /v1/auth/refresh
```typescript
// Request
{ "refresh_token": "..." }

// Response 200
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",  // rotated
    "expires_in": 900
  }
}
```

## 4. Products API

### GET /v1/products
```
Query: ?page=1&limit=20&category_id=uuid&search=laptop&sort=price&order=asc
```

### POST /v1/products
```typescript
// Request
{
  "name": "Laptop Dell XPS",
  "sku": "DELL-XPS-15",
  "barcode": "7501234567890",
  "price": 45000.00,
  "cost": 32000.00,
  "tax_rate": 18.00,
  "category_id": "uuid",
  "brand_id": "uuid",
  "min_stock": 5,
  "unit": "UN"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "laptop-dell-xps",
    "created_at": "2024-01-01T00:00:00Z",
    ...
  }
}
```

## 5. Sales API

### POST /v1/sales
```typescript
// Request
{
  "client_id": "uuid-or-null",
  "items": [
    { "product_id": "uuid", "quantity": 2, "discount": 0 }
  ],
  "payments": [
    { "method_id": "uuid", "amount": 90000.00 }
  ],
  "notes": "Venta al contado"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "subtotal": 90000.00,
    "tax_amount": 16200.00,
    "discount_amount": 0,
    "total": 106200.00,
    "items": [...],
    "payments": [...]
  }
}
```

## 6. Inventory API

### GET /v1/inventory
```
Query: ?product_id=uuid&warehouse_id=uuid
```

### POST /v1/inventory/entry
```typescript
// Request
{
  "product_id": "uuid",
  "warehouse_id": "uuid",
  "quantity": 50,
  "unit_cost": 500.00,
  "movement_type": "PURCHASE_RECEIPT",
  "reference_type": "purchase",
  "reference_id": "uuid",
  "notes": "Recepción OC-001"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "previous_balance": 100,
    "new_balance": 150,
    "movement_type": "PURCHASE_RECEIPT"
  }
}
```

## 7. Pagination Patterns

### Offset-based (default)
```
GET /v1/products?page=1&limit=20
Response: { meta: { total: 150, page: 1, limit: 20, has_next: true } }
```

### Cursor-based (for large datasets)
```
GET /v1/products?cursor=eyJpZCI6InV1aWQifQ==&limit=20
Response: { meta: { next_cursor: "eyJpZCI6...", has_more: true } }
```

## 8. Filtering & Sorting

```
GET /v1/sales?status=confirmed&from=2024-01-01&to=2024-12-31&sort=-created_at
GET /v1/products?category_id=uuid&min_price=100&max_price=500&search=laptop
GET /v1/inventory?warehouse_id=uuid&low_stock=true
```

Filter prefixes:
- `min_`, `max_` → range
- `-field` → descending sort
- `search` → full-text
- `is_` → boolean

## 9. Idempotency

Write operations (POST, PUT, PATCH) should include `X-Idempotency-Key` header. Server returns cached response for duplicate keys within 24 hours.

```typescript
// Backend check
async function checkIdempotency(key: string, payload: any): Promise<boolean> {
  const existing = await db.query(`
    SELECT response FROM idempotency_keys 
    WHERE key = $1 AND expires_at > NOW()
  `, [key]);
  
  if (existing.rows.length > 0) {
    // Verify same payload
    if (JSON.stringify(existing.rows[0].request_payload) !== JSON.stringify(payload)) {
      throw new IdempotencyConflictError();
    }
    return true; // duplicate, return cached response
  }
  
  return false; // new request
}
```
