// ============================================================
// Billing Controller — Express Routes
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, validate, asyncHandler } from '@erp/common';
import { ROLES } from '@erp/common';
import { tenantContext } from '@erp/shared-kernel';
import { GenerateInvoiceDTO, InvoiceQueryDTO, UpdatePaymentStatusDTO, SendEmailDTO } from './DTOs/index.js';

export function createBillingRouter(appService) {
  const router = Router();

  // All routes require authentication
  router.use(authenticate, tenantContext);

  // ==================== INVOICES ====================

  router.get('/',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SELLER),
    validate(InvoiceQueryDTO, 'query'),
    asyncHandler(async (req, res) => {
      const result = await appService.listInvoices(req.validatedQuery);
      res.json({ success: true, ...result });
    })
  );

  router.get('/fiscal-types',
    asyncHandler(async (req, res) => {
      const types = await appService.listFiscalDocumentTypes();
      res.json({ success: true, data: types });
    })
  );

  router.get('/ncf-sequences',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const sequences = await appService.listNcfSequences(req.query);
      res.json({ success: true, data: sequences });
    })
  );

  router.get('/:id',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SELLER),
    asyncHandler(async (req, res) => {
      const invoice = await appService.getInvoice(req.params.id);
      res.json({ success: true, data: invoice });
    })
  );

  router.post('/generate',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER),
    validate(GenerateInvoiceDTO),
    asyncHandler(async (req, res) => {
      const invoice = await appService.generateInvoice({
        ...req.validatedBody,
        userId: req.user.id,
      });
      res.status(201).json({ success: true, data: invoice });
    })
  );

  router.get('/:id/pdf',
    asyncHandler(async (req, res) => {
      const pdfBuffer = await appService.generatePdf(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${req.params.id}.pdf`);
      res.send(pdfBuffer);
    })
  );

  router.post('/:id/send-email',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(SendEmailDTO),
    asyncHandler(async (req, res) => {
      const result = await appService.sendEmail({
        id: req.params.id,
        ...req.validatedBody,
      });
      res.json({ success: true, data: result });
    })
  );

  router.patch('/:id/payment-status',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(UpdatePaymentStatusDTO),
    asyncHandler(async (req, res) => {
      const invoice = await appService.updatePaymentStatus({
        id: req.params.id,
        ...req.validatedBody,
        userId: req.user.id,
      });
      res.json({ success: true, data: invoice });
    })
  );

  router.post('/:id/cancel',
    authorize(ROLES.ADMIN),
    asyncHandler(async (req, res) => {
      const invoice = await appService.cancelInvoice({
        id: req.params.id,
        reason: req.body.reason || 'Cancelled by user',
        userId: req.user.id,
      });
      res.json({ success: true, data: invoice });
    })
  );

  return router;
}
