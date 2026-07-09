// ============================================================
// Procurement Controller — Express Router
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, hasPermission, validate, apiResponse } from '@erp/common';
import { CreatePurchaseDTO, UpdatePurchaseStatusDTO, PurchaseQueryDTO, CreateSupplierDTO, UpdateSupplierDTO, SupplierQueryDTO } from '../DTOs/index.js';

export function createProcurementRouter({ appService }) {
  const router = Router();

  // ─── Purchase Routes ──────────────────────────────────────

  router.get('/purchases/next-number',
    authenticate,
    hasPermission('purchase:read'),
    async (req, res, next) => {
      try {
        const number = await appService.getNextPurchaseNumber();
        return apiResponse(res, 200, { purchaseNumber: number });
      } catch (err) { next(err); }
    }
  );

  router.get('/purchases',
    authenticate,
    hasPermission('purchase:read'),
    async (req, res, next) => {
      try {
        const query = PurchaseQueryDTO.parse(req.query);
        const { data, count } = await appService.listPurchases(query);
        return apiResponse(res, 200, data, {
          page: query.page,
          limit: query.limit,
          total: count,
          totalPages: Math.ceil(count / query.limit),
        });
      } catch (err) { next(err); }
    }
  );

  router.get('/purchases/:id',
    authenticate,
    hasPermission('purchase:read'),
    async (req, res, next) => {
      try {
        const purchase = await appService.getPurchase(req.params.id);
        return apiResponse(res, 200, purchase);
      } catch (err) {
        if (err.message === 'NOT_FOUND') return apiResponse(res, 404, null, null, 'Purchase not found');
        next(err);
      }
    }
  );

  router.post('/purchases',
    authenticate,
    hasPermission('purchase:create'),
    validate(CreatePurchaseDTO, 'body'),
    async (req, res, next) => {
      try {
        const purchase = await appService.createPurchase({
          ...req.body,
          userId: req.user.id,
        });
        return apiResponse(res, 201, purchase);
      } catch (err) { next(err); }
    }
  );

  router.patch('/purchases/:id/status',
    authenticate,
    hasPermission('purchase:update'),
    validate(UpdatePurchaseStatusDTO, 'body'),
    async (req, res, next) => {
      try {
        const purchase = await appService.updatePurchaseStatus({
          id: req.params.id,
          status: req.body.status,
          userId: req.user.id,
        });
        return apiResponse(res, 200, purchase);
      } catch (err) {
        if (err.message === 'NOT_FOUND') return apiResponse(res, 404, null, null, 'Purchase not found');
        next(err);
      }
    }
  );

  router.post('/purchases/:id/cancel',
    authenticate,
    hasPermission('purchase:cancel'),
    async (req, res, next) => {
      try {
        const purchase = await appService.cancelPurchase({
          id: req.params.id,
          userId: req.user.id,
        });
        return apiResponse(res, 200, purchase);
      } catch (err) {
        if (err.message === 'NOT_FOUND') return apiResponse(res, 404, null, null, 'Purchase not found');
        if (err.message === 'ALREADY_CANCELLED') return apiResponse(res, 400, null, null, 'Purchase already cancelled');
        next(err);
      }
    }
  );

  // ─── Supplier Routes ──────────────────────────────────────

  router.get('/suppliers',
    authenticate,
    hasPermission('purchase:read'),
    async (req, res, next) => {
      try {
        const query = SupplierQueryDTO.parse(req.query);
        const isActive = query.isActive !== undefined ? query.isActive === 'true' : undefined;
        const { data, count } = await appService.listSuppliers({ ...query, isActive });
        return apiResponse(res, 200, data, {
          page: query.page,
          limit: query.limit,
          total: count,
          totalPages: Math.ceil(count / query.limit),
        });
      } catch (err) { next(err); }
    }
  );

  router.get('/suppliers/:id',
    authenticate,
    hasPermission('purchase:read'),
    async (req, res, next) => {
      try {
        const supplier = await appService.getSupplier(req.params.id);
        return apiResponse(res, 200, supplier);
      } catch (err) {
        if (err.message === 'NOT_FOUND') return apiResponse(res, 404, null, null, 'Supplier not found');
        next(err);
      }
    }
  );

  router.post('/suppliers',
    authenticate,
    hasPermission('purchase:create'),
    validate(CreateSupplierDTO, 'body'),
    async (req, res, next) => {
      try {
        const supplier = await appService.createSupplier(req.body);
        return apiResponse(res, 201, supplier);
      } catch (err) {
        if (err.message === 'DUPLICATE_NAME') return apiResponse(res, 409, null, null, 'Supplier name already exists');
        next(err);
      }
    }
  );

  router.put('/suppliers/:id',
    authenticate,
    hasPermission('purchase:update'),
    validate(UpdateSupplierDTO, 'body'),
    async (req, res, next) => {
      try {
        const supplier = await appService.updateSupplier({ id: req.params.id, data: req.body });
        return apiResponse(res, 200, supplier);
      } catch (err) {
        if (err.message === 'NOT_FOUND') return apiResponse(res, 404, null, null, 'Supplier not found');
        next(err);
      }
    }
  );

  router.delete('/suppliers/:id',
    authenticate,
    hasPermission('inventory:adjust'),
    async (req, res, next) => {
      try {
        await appService.deleteSupplier(req.params.id);
        return apiResponse(res, 200, { message: 'Supplier deleted successfully' });
      } catch (err) {
        if (err.message === 'NOT_FOUND') return apiResponse(res, 404, null, null, 'Supplier not found');
        if (err.message === 'HAS_RELATIONS') return apiResponse(res, 409, null, null, 'Cannot delete: supplier has associated purchases');
        next(err);
      }
    }
  );

  return router;
}
