// ============================================================
// CRM Controller — Express Routes
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, validate, asyncHandler } from '@erp/common';
import { ROLES } from '@erp/common';
import { CreateClientDTO, UpdateClientDTO, CreateCreditAccountDTO, UpdateCreditAccountDTO, UpdateNotificationPrefsDTO } from './DTOs/index.js';

export function createCRMRouter(appService) {
  const router = Router();

  router.use(authenticate);

  // ==================== CLIENTS ====================

  router.get('/',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const result = await appService.listClients(req.query);
      res.json({ success: true, ...result });
    })
  );

  router.get('/by-user/:userId',
    asyncHandler(async (req, res) => {
      const client = await appService.getClientByUserId(req.params.userId);
      res.json({ success: true, data: client });
    })
  );

  router.get('/:id',
    asyncHandler(async (req, res) => {
      const client = await appService.getClient(req.params.id);
      res.json({ success: true, data: client });
    })
  );

  router.post('/',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(CreateClientDTO),
    asyncHandler(async (req, res) => {
      const client = await appService.createClient(req.validatedBody);
      res.status(201).json({ success: true, data: client });
    })
  );

  router.put('/:id',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(UpdateClientDTO),
    asyncHandler(async (req, res) => {
      const client = await appService.updateClient(req.params.id, req.validatedBody);
      res.json({ success: true, data: client });
    })
  );

  router.delete('/:id',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const result = await appService.deleteClient(req.params.id);
      res.json({ success: true, ...result });
    })
  );

  // ==================== CREDIT ACCOUNTS ====================

  router.get('/credit-account',
    asyncHandler(async (req, res) => {
      const account = await appService.getCreditAccountByUserId(req.user.id);
      res.json({ success: true, data: account });
    })
  );

  router.post('/credit-account',
    validate(CreateCreditAccountDTO),
    asyncHandler(async (req, res) => {
      const account = await appService.createCreditAccount({
        ...req.validatedBody,
        clientId: req.user.id, // Will be resolved via client lookup in use case
      });
      res.status(201).json({ success: true, data: account });
    })
  );

  router.put('/credit-account/:id',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(UpdateCreditAccountDTO),
    asyncHandler(async (req, res) => {
      const account = await appService.updateCreditAccount(req.params.id, req.validatedBody);
      res.json({ success: true, data: account });
    })
  );

  // ==================== NOTIFICATION PREFERENCES ====================

  router.get('/notification-prefs',
    asyncHandler(async (req, res) => {
      const prefs = await appService.getNotificationPrefsByUserId(req.user.id);
      res.json({ success: true, data: prefs });
    })
  );

  router.put('/notification-prefs',
    validate(UpdateNotificationPrefsDTO),
    asyncHandler(async (req, res) => {
      const prefs = await appService.updateNotificationPrefsByUserId(req.user.id, req.validatedBody);
      res.json({ success: true, data: prefs });
    })
  );

  return router;
}
