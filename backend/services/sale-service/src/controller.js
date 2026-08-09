// ============================================================
// Sale Controller — Express Routes (Hexagonal)
// Merged: Sales + Cart + Checkout
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, validate, asyncHandler } from '@erp/common';
import { ROLES } from '@erp/common';
import { tenantContext } from '@erp/shared-kernel';
import {
  CreateSaleDTO,
  SaleQueryDTO,
  AddCartItemDTO,
  UpdateCartItemDTO,
  CheckoutDTO,
} from './DTOs/index.js';

export function createSalesRouter(appService) {
  const router = Router();

  // All routes require authentication
  router.use(authenticate, tenantContext);

  // ─── Sales ────────────────────────────────────────────────

  router.post('/',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER),
    validate(CreateSaleDTO, 'body'),
    asyncHandler(async (req, res) => {
      const sale = await appService.createSale({ userId: req.user.id, ...req.validatedBody });
      res.status(201).json({ success: true, data: sale });
    })
  );

  router.get('/',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER),
    validate(SaleQueryDTO, 'query'),
    asyncHandler(async (req, res) => {
      const result = await appService.listSales(req.validatedQuery);
      res.json({ success: true, ...result });
    })
  );

  // ─── Client self-service: my sales ─────────────────────────
  // MUST be before /:id to avoid Express matching "my-sales" as an :id param
  router.get('/my-sales',
    validate(SaleQueryDTO, 'query'),
    asyncHandler(async (req, res) => {
      const result = await appService.getClientSalesByUserId(req.user.id, req.validatedQuery);
      res.json({ success: true, ...result });
    })
  );

  // ─── Cart ─────────────────────────────────────────────────
  // MUST be before /:id to avoid Express matching "cart" as an :id param
  router.get('/cart',
    asyncHandler(async (req, res) => {
      const cart = await appService.getCart(req.user.id);
      res.json({ success: true, data: cart });
    })
  );

  router.post('/cart/items',
    validate(AddCartItemDTO, 'body'),
    asyncHandler(async (req, res) => {
      const item = await appService.addCartItem({ userId: req.user.id, ...req.validatedBody });
      res.status(201).json({ success: true, data: item });
    })
  );

  router.put('/cart/items/:itemId',
    validate(UpdateCartItemDTO, 'body'),
    asyncHandler(async (req, res) => {
      const item = await appService.updateCartItem(req.params.itemId, req.validatedBody.quantity);
      res.json({ success: true, data: item });
    })
  );

  router.delete('/cart/items/:itemId',
    asyncHandler(async (req, res) => {
      await appService.removeCartItem(req.params.itemId);
      res.json({ success: true, message: 'Item removed from cart' });
    })
  );

  router.delete('/cart',
    asyncHandler(async (req, res) => {
      await appService.clearCart(req.user.id);
      res.json({ success: true, message: 'Cart cleared' });
    })
  );

  // ─── Checkout ────────────────────────────────────────────
  // MUST be before /:id to avoid Express matching "checkout" as an :id param
  router.post('/checkout',
    validate(CheckoutDTO, 'body'),
    asyncHandler(async (req, res) => {
      const sale = await appService.checkout({ userId: req.user.id, ...req.validatedBody });
      res.status(201).json({ success: true, data: sale });
    })
  );

  // ─── Sales (parameterized) ────────────────────────────────
  // These use :id param which would shadow /cart, /my-sales, /checkout etc.
  // so they MUST be defined AFTER the specific routes above.

  router.get('/client/:clientId',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER),
    validate(SaleQueryDTO, 'query'),
    asyncHandler(async (req, res) => {
      const result = await appService.getClientSales(req.params.clientId, req.validatedQuery);
      res.json({ success: true, ...result });
    })
  );

  router.get('/:id',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER),
    asyncHandler(async (req, res) => {
      const sale = await appService.getSale(req.params.id);
      res.json({ success: true, data: sale });
    })
  );

  router.post('/:id/cancel',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const result = await appService.cancelSale({ id: req.params.id, userId: req.user.id, reason: req.body.reason });
      res.json({ success: true, data: result });
    })
  );

  return router;
}
