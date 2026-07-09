// ============================================================
// Payments Controller — Express Routes
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, validate, asyncHandler } from '@erp/common';
import { ROLES } from '@erp/common';
import { ProcessPaymentDTO, RefundPaymentDTO, OpenCashRegisterDTO, CloseCashRegisterDTO } from './DTOs/index.js';

export function createPaymentsRouter(appService) {
  const router = Router();

  router.use(authenticate);

  // ==================== PAYMENT METHODS ====================

  router.get('/methods',
    asyncHandler(async (req, res) => {
      const methods = await appService.listPaymentMethods();
      res.json({ success: true, data: methods });
    })
  );

  // ==================== TRANSACTIONS ====================

  router.post('/process',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SALESMAN),
    validate(ProcessPaymentDTO),
    asyncHandler(async (req, res) => {
      const transaction = await appService.processPayment({
        ...req.validatedBody,
        userId: req.user.id,
      });
      res.status(201).json({ success: true, data: transaction });
    })
  );

  router.post('/refund',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(RefundPaymentDTO),
    asyncHandler(async (req, res) => {
      const transaction = await appService.refundPayment({
        ...req.validatedBody,
        userId: req.user.id,
      });
      res.json({ success: true, data: transaction });
    })
  );

  router.get('/transactions/:saleId',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const transactions = await appService.getPaymentTransactions(req.params.saleId);
      res.json({ success: true, data: transactions });
    })
  );

  // ==================== CASH REGISTERS ====================

  router.get('/registers',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const registers = await appService.listCashRegisters(req.query);
      res.json({ success: true, data: registers });
    })
  );

  router.post('/registers/open',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(OpenCashRegisterDTO),
    asyncHandler(async (req, res) => {
      const register = await appService.openCashRegister({
        ...req.validatedBody,
        userId: req.user.id,
      });
      res.status(201).json({ success: true, data: register });
    })
  );

  router.post('/registers/:id/close',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(CloseCashRegisterDTO),
    asyncHandler(async (req, res) => {
      const register = await appService.closeCashRegister({
        id: req.params.id,
        ...req.validatedBody,
        userId: req.user.id,
      });
      res.json({ success: true, data: register });
    })
  );

  return router;
}
