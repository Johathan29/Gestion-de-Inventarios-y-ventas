# TRD: Ecommerce & Store Service

## 1. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (3000)                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│            ecommerce-service (3012)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Store    │ │ Cart     │ │ Checkout │ │ Promotions│  │
│  │ Catalog  │ │ Manager  │ │ Service  │ │ Service   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │             │            │              │        │
│  ┌────▼─────────────▼────────────▼──────────────▼─────┐ │
│  │              Ecommerce Domain                       │ │
│  │  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ ProductRepo  │  │ CartRepo     │                │ │
│  │  │ (read-only)  │  │ (user-scoped)│                │ │
│  │  └──────────────┘  └──────────────┘                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 2. Cart System

```typescript
// Carrito persistente por usuario
async function getOrCreateCart(userId: string): Promise<Cart> {
  let cart = await db.query(`
    SELECT * FROM carts WHERE user_id = $1 AND status = 'active'
  `, [userId]);
  
  if (cart.rows.length === 0) {
    cart = await db.query(`
      INSERT INTO carts (user_id, status) VALUES ($1, 'active') RETURNING *
    `, [userId]);
  }
  
  // Attach items
  const items = await db.query(`
    SELECT ci.*, p.name, p.price, p.image_url, p.sku
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = $1
  `, [cart.rows[0].id]);
  
  return { ...cart.rows[0], items: items.rows };
}

async function addToCart(userId: string, productId: string, quantity: number): Promise<Cart> {
  const cart = await getOrCreateCart(userId);
  
  // Check if already in cart
  const existing = await db.query(`
    SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2
  `, [cart.id, productId]);
  
  if (existing.rows.length > 0) {
    // Update quantity
    await db.query(`
      UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2
    `, [quantity, existing.rows[0].id]);
  } else {
    // Get price from catalog (backend)
    const product = await db.query(`SELECT price FROM products WHERE id = $1`, [productId]);
    
    await db.query(`
      INSERT INTO cart_items (cart_id, product_id, quantity, unit_price)
      VALUES ($1, $2, $3, $4)
    `, [cart.id, productId, quantity, product.rows[0].price]);
  }
  
  return getOrCreateCart(userId);
}
```

## 3. Checkout Flow

```typescript
async function processCheckout(userId: string, checkoutData: CheckoutDTO): Promise<CheckoutResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Get cart with items
    const cart = await getCartWithItems(client, userId);
    if (!cart.items.length) throw new EmptyCartError();
    
    // 2. Reserve stock (with timeout)
    const reservations = [];
    for (const item of cart.items) {
      const reservation = await inventoryService.reserveStock(
        item.product_id,
        checkoutData.warehouse_id || item.preferred_warehouse,
        item.quantity,
        'checkout',
        cart.id,
        userId
      );
      reservations.push(reservation);
    }
    
    // 3. Calculate totals (backend)
    const totals = calculateCheckoutTotals(cart.items, checkoutData.coupon_code);
    
    // 4. Create checkout session
    const session = await client.query(`
      INSERT INTO checkout_sessions (
        user_id, cart_id, status, subtotal, tax_amount,
        discount_amount, total, shipping_address, reservations,
        expires_at
      ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '15 minutes')
      RETURNING *
    `, [
      userId, cart.id, totals.subtotal, totals.tax,
      totals.discount, totals.total,
      JSON.stringify(checkoutData.shipping_address),
      JSON.stringify(reservations.map(r => r.id))
    ]);
    
    // 5. Process payment
    const payment = await paymentService.processPayment({
      amount: totals.total,
      method: checkoutData.payment_method,
      reference: checkoutData.payment_reference,
      session_id: session.rows[0].id
    });
    
    if (!payment.success) {
      // Release reservations on payment failure
      for (const r of reservations) {
        await inventoryService.releaseReservation(r.id);
      }
      throw new PaymentFailedError(payment.error);
    }
    
    // 6. Confirm sale
    const sale = await saleService.createFromCheckout(session.rows[0], userId);
    
    // 7. Deduct actual stock
    await inventoryService.confirmDeduction(reservations);
    
    // 8. Mark checkout complete
    await client.query(`
      UPDATE checkout_sessions SET status = 'completed' WHERE id = $1
    `, [session.rows[0].id]);
    
    // 9. Clear cart
    await client.query(`
      UPDATE carts SET status = 'completed' WHERE id = $1
    `, [cart.id]);
    
    // 10. Publish events
    await client.query(`
      INSERT INTO transactional_outbox (aggregate_type, aggregate_id, event_type, payload)
      VALUES ('Sale', $1, 'OnlineSaleCompleted', $2)
    `, [sale.id, JSON.stringify({
      sale_id: sale.id,
      user_id: userId,
      total: totals.total,
      payment_method: checkoutData.payment_method
    })]);
    
    await client.query('COMMIT');
    
    return {
      sale_id: sale.id,
      total: totals.total,
      payment_status: 'completed'
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## 4. Promotions Engine

```typescript
async function applyPromotion(
  code: string, 
  userId: string, 
  cartTotal: number
): Promise<DiscountResult> {
  // Find promotion
  const promo = await db.query(`
    SELECT * FROM promotions 
    WHERE code = $1 
      AND is_active = true 
      AND start_date <= NOW() 
      AND end_date >= NOW()
  `, [code]);
  
  if (promo.rows.length === 0) {
    throw new PromotionNotFoundError(code);
  }
  
  const p = promo.rows[0];
  
  // Check usage limits
  if (p.max_uses && p.current_uses >= p.max_uses) {
    throw new PromotionLimitReachedError(code);
  }
  
  // Check per-user limit
  const userUsage = await db.query(`
    SELECT COUNT(*) as count FROM coupon_usage 
    WHERE promotion_id = $1 AND user_id = $2
  `, [p.id, userId]);
  
  if (p.max_uses_per_user && userUsage.rows[0].count >= p.max_uses_per_user) {
    throw new PromotionUserLimitError(code);
  }
  
  // Calculate discount
  let discount = 0;
  if (p.discount_type === 'percentage') {
    discount = cartTotal * (p.discount_value / 100);
    if (p.max_discount) discount = Math.min(discount, p.max_discount);
  } else {
    discount = Math.min(p.discount_value, cartTotal);
  }
  
  // Record usage
  await db.query(`
    INSERT INTO coupon_usage (promotion_id, user_id, discount_amount)
    VALUES ($1, $2, $3)
  `, [p.id, userId, discount]);
  
  return {
    code: p.code,
    discount_type: p.discount_type,
    discount_value: p.discount_value,
    discount_amount: discount,
    description: p.description
  };
}
```
