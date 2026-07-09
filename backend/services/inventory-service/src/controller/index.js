// ============================================================
// Inventory Controller — Express Router
// ============================================================

import { Router } from 'express';
import { authenticate, hasPermission, validate, asyncHandler } from '@erp/common';
import {
  StockQueryDTO, CreateEntryDTO, CreateExitDTO,
  CreateAdjustmentDTO, CreateTransferDTO, MovementQueryDTO,
  CreateReservationDTO,
} from '../DTOs/index.js';

export function createInventoryRouter({ appService }) {
  const router = Router();

  // ─── Stock ────────────────────────────────────────────────

  router.get('/stock',
    authenticate,
    hasPermission('inventory:read'),
    asyncHandler(async (req, res) => {
      const query = StockQueryDTO.parse(req.query);
      const { data, count } = await appService.getStock(query);
      res.json({
        success: true,
        data,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: count,
          totalPages: Math.ceil(count / query.limit),
        },
      });
    })
  );

  router.get('/stock/:productId',
    authenticate,
    hasPermission('inventory:read'),
    asyncHandler(async (req, res) => {
      const result = await appService.getStockByProduct(req.params.productId);
      res.json({ success: true, data: result });
    })
  );

  // ─── Movements ───────────────────────────────────────────

  router.get('/movements',
    authenticate,
    hasPermission('inventory:read'),
    asyncHandler(async (req, res) => {
      const query = MovementQueryDTO.parse(req.query);
      const { data, count } = await appService.getMovements(query);
      res.json({
        success: true,
        data,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: count,
          totalPages: Math.ceil(count / query.limit),
        },
      });
    })
  );

  router.get('/kardex/:productId',
    authenticate,
    hasPermission('inventory:read'),
    asyncHandler(async (req, res) => {
      const kardex = await appService.getKardex(req.params.productId);
      res.json({ success: true, data: kardex });
    })
  );

  // ─── Operations ──────────────────────────────────────────

  router.post('/entries',
    authenticate,
    hasPermission('inventory:create'),
    validate(CreateEntryDTO, 'body'),
    asyncHandler(async (req, res) => {
      const result = await appService.createEntry({ ...req.body, userId: req.user.id });
      res.status(201).json({ success: true, data: result });
    })
  );

  router.post('/exits',
    authenticate,
    hasPermission('inventory:create'),
    validate(CreateExitDTO, 'body'),
    asyncHandler(async (req, res) => {
      try {
        const result = await appService.createExit({ ...req.body, userId: req.user.id });
        res.status(201).json({ success: true, data: result });
      } catch (err) {
        if (err.message === 'INSUFFICIENT_STOCK') {
          return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }
        throw err;
      }
    })
  );

  router.post('/adjustments',
    authenticate,
    hasPermission('inventory:adjust'),
    validate(CreateAdjustmentDTO, 'body'),
    asyncHandler(async (req, res) => {
      const result = await appService.createAdjustment({ ...req.body, userId: req.user.id });
      res.status(201).json({ success: true, data: result });
    })
  );

  router.post('/transfers',
    authenticate,
    hasPermission('inventory:transfer'),
    validate(CreateTransferDTO, 'body'),
    asyncHandler(async (req, res) => {
      try {
        const result = await appService.createTransfer({ ...req.body, userId: req.user.id });
        res.json({ success: true, data: result });
      } catch (err) {
        if (err.message === 'INSUFFICIENT_STOCK') {
          return res.status(400).json({ success: false, message: 'Insufficient stock in source warehouse' });
        }
        throw err;
      }
    })
  );

  // ─── Alerts & Summary ────────────────────────────────────

  router.get('/alerts',
    authenticate,
    hasPermission('inventory:read'),
    asyncHandler(async (req, res) => {
      const threshold = parseInt(req.query.threshold) || 5;
      const alerts = await appService.getAlerts(threshold);
      res.json({ success: true, data: alerts });
    })
  );

  router.get('/summary',
    authenticate,
    hasPermission('inventory:read'),
    asyncHandler(async (req, res) => {
      const summary = await appService.getSummary();
      res.json({ success: true, data: summary });
    })
  );

  // ─── Reservations ────────────────────────────────────────

  router.post('/reservations',
    authenticate,
    hasPermission('inventory:create'),
    validate(CreateReservationDTO, 'body'),
    asyncHandler(async (req, res) => {
      try {
        const reservation = await appService.createReservation({ ...req.body, userId: req.user.id });
        res.status(201).json({ success: true, data: reservation });
      } catch (err) {
        if (err.message === 'INSUFFICIENT_STOCK' || err.message === 'INSUFFICIENT_AVAILABLE_STOCK') {
          return res.status(400).json({ success: false, message: err.message });
        }
        throw err;
      }
    })
  );

  return router;
}
