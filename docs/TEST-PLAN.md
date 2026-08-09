# Test Plan: ERP System

## 1. Testing Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Testing Pyramid                       │
│                                                          │
│                       /\                                 │
│                      /  \        E2E Tests               │
│                     / E2E\       (Playwright/Cypress)    │
│                    /──────\      ~10% of tests           │
│                   /        \                             │
│                  /Integration\   Integration Tests        │
│                 /   Tests     \  (Supertest + Test DB)   │
│                /───────────────\ ~30% of tests           │
│               /                 \                         │
│              /    Unit Tests     \  Unit Tests            │
│             /                     \ (Jest/Vitest)         │
│            /───────────────────────\ ~60% of tests       │
└─────────────────────────────────────────────────────────┘
```

## 2. Test Environment

| Component | Tool | Purpose |
|-----------|------|---------|
| Unit Testing | Vitest (ESM) / Jest (CJS) | Fast isolated tests |
| Integration | Supertest + Testcontainers | API + DB tests |
| E2E | Playwright | Full user flows |
| Load | k6 | Performance testing |
| Security | OWASP ZAP | Security scanning |
| Coverage | c8 / Istanbul | Code coverage |

## 3. Unit Tests by Module

### Identity Service
```typescript
// tests/unit/auth.test.ts
describe('AuthService', () => {
  describe('login', () => {
    it('should return JWT tokens for valid credentials', async () => { ... });
    it('should throw INVALID_CREDENTIALS for wrong password', async () => { ... });
    it('should throw ACCOUNT_LOCKED after 10 failed attempts', async () => { ... });
    it('should rate limit to 5 requests per minute per IP', async () => { ... });
  });
  
  describe('refreshToken', () => {
    it('should return new token pair for valid refresh token', async () => { ... });
    it('should invalidate old refresh token (rotation)', async () => { ... });
    it('should reject expired refresh token', async () => { ... });
    it('should reject reused refresh token', async () => { ... });
  });
  
  describe('RBAC', () => {
    it('should allow admin full access', async () => { ... });
    it('should restrict employee from user management', async () => { ... });
    it('should restrict cliente to own data only', async () => { ... });
    it('should enforce ABAC company_id match', async () => { ... });
  });
});
```

### Inventory Service
```typescript
// tests/unit/inventory.test.ts
describe('InventoryService', () => {
  describe('ledger', () => {
    it('should auto-calculate previous_balance and new_balance', async () => { ... });
    it('should increase balance on PURCHASE_RECEIPT', async () => { ... });
    it('should decrease balance on SALE', async () => { ... });
    it('should prevent negative stock', async () => { ... });
    it('should be immutable (no update/delete)', async () => { ... });
  });
  
  describe('transfer', () => {
    it('should create TRANSFER_OUT and TRANSFER_IN atomically', async () => { ... });
    it('should rollback on insufficient source stock', async () => { ... });
    it('should rollback if destination warehouse is inactive', async () => { ... });
  });
  
  describe('reservation', () => {
    it('should reserve stock without deducting', async () => { ... });
    it('should release reservation on timeout', async () => { ... });
    it('should confirm deduction when sale confirmed', async () => { ... });
    it('should prevent reservation if stock insufficient', async () => { ... });
  });
});
```

### Sale Service
```typescript
// tests/unit/sale.test.ts
describe('SaleService', () => {
  describe('state machine', () => {
    it('should transition pending → confirmed', async () => { ... });
    it('should transition confirmed → processing', async () => { ... });
    it('should NOT transition completed → pending', async () => { ... });
    it('should NOT transition cancelled → any', async () => { ... });
  });
  
  describe('calculations', () => {
    it('should calculate subtotal from items', async () => { ... });
    it('should calculate tax from subtotal', async () => { ... });
    it('should apply discount before tax', async () => { ... });
    it('should get price from catalog (not client)', async () => { ... });
  });
  
  describe('cash register', () => {
    it('should only allow one open session per register', async () => { ... });
    it('should calculate difference on close', async () => { ... });
    it('should track all movements during session', async () => { ... });
  });
});
```

### Invoice Service
```typescript
// tests/unit/invoice.test.ts
describe('InvoiceService', () => {
  describe('NCF', () => {
    it('should auto-generate sequential NCF', async () => { ... });
    it('should NOT allow duplicate NCF', async () => { ... });
    it('should format NCF as prefix + 8-digit number', async () => { ... });
    it('should stop when max_number reached', async () => { ... });
  });
  
  describe('credit notes', () => {
    it('should reference original invoice', async () => { ... });
    it('should not exceed original invoice amount', async () => { ... });
  });
});
```

## 4. Integration Tests

### Full Sale Flow
```typescript
// tests/integration/sale-flow.test.ts
describe('Sale Flow Integration', () => {
  it('complete sale: create → confirm → complete', async () => {
    // 1. Create sale
    const sale = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ items: [{ product_id, quantity: 2 }], payments: [{ method_id, amount: 100 }] })
      .expect(201);
    
    // 2. Confirm sale (stock reserved)
    await request(app)
      .patch(`/api/v1/sales/${sale.body.data.id}/status`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ status: 'confirmed' })
      .expect(200);
    
    // 3. Verify stock deducted
    const inventory = await request(app)
      .get(`/api/v1/inventory?product_id=${product_id}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(inventory.body.data.quantity).toBe(initialStock - 2);
    
    // 4. Complete sale
    await request(app)
      .patch(`/api/v1/sales/${sale.body.data.id}/status`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ status: 'completed' })
      .expect(200);
    
    // 5. Verify outbox event created
    const events = await db.query(
      "SELECT * FROM transactional_outbox WHERE aggregate_id = $1",
      [sale.body.data.id]
    );
    expect(events.rows.length).toBeGreaterThan(0);
  });
});
```

### Inventory Ledger Integration
```typescript
// tests/integration/inventory-ledger.test.ts
describe('Inventory Ledger Integration', () => {
  it('should maintain correct balances through multiple movements', async () => {
    // Purchase receipt: +100
    await inventoryService.entry(productId, warehouseId, 'PURCHASE_RECEIPT', 100, 50);
    expect(await inventoryService.getBalance(productId, warehouseId)).toBe(100);
    
    // Sale: -20
    await inventoryService.entry(productId, warehouseId, 'SALE', 20, 50);
    expect(await inventoryService.getBalance(productId, warehouseId)).toBe(80);
    
    // Adjustment: -5
    await inventoryService.entry(productId, warehouseId, 'ADJUSTMENT_NEGATIVE', 5, 50);
    expect(await inventoryService.getBalance(productId, warehouseId)).toBe(75);
    
    // Verify ledger has 3 entries
    const ledger = await db.query(
      "SELECT * FROM inventory_ledger WHERE product_id = $1", [productId]
    );
    expect(ledger.rows.length).toBe(3);
    
    // Verify materialized view refreshed
    const balance = await db.query(
      "SELECT * FROM inventory_balances WHERE product_id = $1", [productId]
    );
    expect(balance.rows[0].quantity).toBe(75);
  });
});
```

### Checkout Flow Integration
```typescript
// tests/integration/checkout-flow.test.ts
describe('Checkout Flow Integration', () => {
  it('complete ecommerce checkout', async () => {
    // 1. Add to cart
    await request(app)
      .post('/api/v1/store/cart')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ product_id, quantity: 3 });
    
    // 2. Apply coupon
    const discount = await request(app)
      .post('/api/v1/store/promotions/apply')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ code: 'DESCUENTO10' });
    
    expect(discount.body.data.discount_amount).toBeGreaterThan(0);
    
    // 3. Checkout (stock reserved)
    const checkout = await request(app)
      .post('/api/v1/store/checkout')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ payment_method: 'card' });
    
    expect(checkout.body.data.status).toBe('pending');
    
    // 4. Verify reservation
    const reservations = await db.query(
      "SELECT * FROM inventory_reservations WHERE reference_id = $1",
      [checkout.body.data.id]
    );
    expect(reservations.rows.length).toBe(1);
  });
});
```

## 5. E2E Tests (Playwright)

```typescript
// tests/e2e/pos-sale.spec.ts
test('POS sale complete flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'employee@test.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-btn"]');
  
  // Navigate to POS
  await page.click('[data-testid="nav-pos"]');
  
  // Scan barcode
  await page.fill('[data-testid="barcode-input"]', '7501234567890');
  await page.press('[data-testid="barcode-input"]', 'Enter');
  
  // Verify product added
  await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
  
  // Set quantity
  await page.fill('[data-testid="qty-0"]', '2');
  
  // Process payment
  await page.click('[data-testid="pay-btn"]');
  await page.click('[data-testid="payment-cash"]');
  await page.fill('[data-testid="amount-given"]', '50000');
  await page.click('[data-testid="confirm-payment"]');
  
  // Verify sale created
  await expect(page.locator('[data-testid="sale-success"]')).toBeVisible();
});
```

## 6. Load Tests (k6)

```javascript
// tests/load/api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // ramp up
    { duration: '1m', target: 50 },   // sustained load
    { duration: '30s', target: 100 }, // peak
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% under 200ms
    http_req_failed: ['rate<0.01'],    // <1% error rate
  },
};

export default function () {
  const token = login();
  
  // Product listing
  const products = http.get(`${BASE_URL}/api/v1/products?page=1&limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(products, { 'products 200': (r) => r.status === 200 });
  
  // Inventory check
  const inventory = http.get(`${BASE_URL}/api/v1/inventory`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(inventory, { 'inventory 200': (r) => r.status === 200 });
  
  sleep(1);
}
```

## 7. Security Tests

```typescript
// tests/security/security.test.ts
describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const res = await request(app)
      .get("/api/v1/products?search='; DROP TABLE products; --")
      .expect(200); // should return empty, not error
    
    // Verify products table still exists
    const check = await db.query("SELECT COUNT(*) FROM products");
    expect(parseInt(check.rows[0].count)).toBeGreaterThan(0);
  });
  
  it('should prevent XSS in product names', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '<script>alert("xss")</script>', price: 100 });
    
    // Should sanitize or reject
    if (res.status === 201) {
      expect(res.body.data.name).not.toContain('<script>');
    }
  });
  
  it('should enforce RLS - employee cannot see other company data', async () => {
    const res = await request(app)
      .get(`/api/v1/products?company_id=${otherCompanyId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    
    // Should return empty or 403
    expect([200, 403]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data.length).toBe(0);
    }
  });
  
  it('should prevent credit card data in localStorage', async () => {
    // Check frontend code
    const localStorage = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.filter(k => k.includes('card') || k.includes('credit'));
    });
    expect(localStorage.length).toBe(0);
  });
});
```

## 8. Test Coverage Targets

| Module | Unit | Integration | E2E |
|--------|------|-------------|-----|
| Identity/Auth | 90% | 80% | 70% |
| Catalog/Products | 85% | 75% | 60% |
| Inventory/Ledger | 90% | 85% | 50% |
| Sales/POS | 85% | 80% | 70% |
| Invoices/Fiscal | 85% | 80% | 50% |
| Ecommerce | 80% | 75% | 80% |
| Notifications | 80% | 70% | - |
| Reporting | 75% | 60% | 40% |
| **Overall** | **85%** | **78%** | **60%** |

## 9. Test Execution

```bash
# Unit tests
npm run test:unit

# Integration tests (requires test DB)
npm run test:integration

# E2E tests (requires running server)
npm run test:e2e

# Load tests
k6 run tests/load/api-load.js

# Security scan
npm run test:security

# Full suite
npm run test:all

# Coverage report
npm run test:coverage
```

## 10. CI/CD Integration

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: supabase/postgres:15
      env:
        POSTGRES_DB: erp_test
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
    redis:
      image: redis:7
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run test:unit
    - run: npm run test:integration
    - run: npm run test:coverage
    - uses: codecov/codecov-action@v3
```
