// ============================================================
// CRM Controller — Express Routes
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, validate, asyncHandler } from '@erp/common';
import { ROLES } from '@erp/common';
import { tenantContext } from '@erp/shared-kernel';
import { CreateClientDTO, UpdateClientDTO, CreateCreditAccountDTO, UpdateCreditAccountDTO, UpdateNotificationPrefsDTO } from './DTOs/index.js';
import { NotificationPreferenceMapper } from './mappers/index.js';

export function createCRMRouter(appService, crmRepos) {
  const router = Router();
  router.use(authenticate, tenantContext);

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

  // ==================== CREDIT ACCOUNTS ====================
  // ⚠️ Las rutas estáticas van ANTES de /:id (si no, Express las captura como :id → 404)

  router.get('/credit-account',
    asyncHandler(async (req, res) => {
      const account = await appService.getCreditAccountByUserId(req.user.id);
      res.json({ success: true, data: account });
    })
  );

  router.post('/credit-account',
    validate(CreateCreditAccountDTO),
    asyncHandler(async (req, res) => {
      // Seguridad: solo admin/supervisor pueden fijar límite de crédito.
      // El cliente nunca puede auto-aumentarse el límite.
      const isStaff = [ROLES.ADMIN, ROLES.SUPERVISOR].includes(req.user.role);
      const account = await appService.createCreditAccount({
        ...req.validatedBody,
        creditLimit: isStaff ? (req.validatedBody.creditLimit ?? 0) : 0,
        clientId: req.user.id,
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
      res.json({ success: true, data: NotificationPreferenceMapper.toDTO(prefs) });
    })
  );

  router.put('/notification-prefs',
    validate(UpdateNotificationPrefsDTO),
    asyncHandler(async (req, res) => {
      const prefs = await appService.updateNotificationPrefsByUserId(req.user.id, req.validatedBody);
      res.json({ success: true, data: NotificationPreferenceMapper.toDTO(prefs) });
    })
  );

  // ==================== CLIENTS (rutas con :id — van después de las estáticas) ====================

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
    asyncHandler(async (req, res, next) => {
      // Self-service: un cliente solo puede editar SU propio registro.
      // Admin/Supervisor conservan acceso completo.
      const isStaff = [ROLES.ADMIN, ROLES.SUPERVISOR].includes(req.user.role);
      if (!isStaff) {
        let client = null;
        try { client = await appService.getClient(req.params.id); } catch { /* no encontrado */ }
        if (!client || client.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar este cliente' },
          });
        }
      }
      next();
    }),
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

  // ==================== CRM PIPELINES ====================
  if (crmRepos) {
    const { pipelineRepo, stageRepo, leadRepo, activityRepo, noteRepo, sourceRepo, taskRepo } = crmRepos;

    router.get('/pipelines',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await pipelineRepo.findAll(req.companyId);
        res.json({ success: true, data });
      })
    );

    router.get('/pipelines/:id',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await pipelineRepo.findById(req.params.id, req.companyId);
        if (!data) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pipeline no encontrado' } });
        res.json({ success: true, data });
      })
    );

    router.post('/pipelines',
      authorize(ROLES.ADMIN),
      asyncHandler(async (req, res) => {
        const data = await pipelineRepo.create({ ...req.body, company_id: req.companyId });
        res.status(201).json({ success: true, data });
      })
    );

    router.put('/pipelines/:id',
      authorize(ROLES.ADMIN),
      asyncHandler(async (req, res) => {
        const data = await pipelineRepo.update(req.params.id, req.body);
        res.json({ success: true, data });
      })
    );

    router.delete('/pipelines/:id',
      authorize(ROLES.ADMIN),
      asyncHandler(async (req, res) => {
        const result = await pipelineRepo.delete(req.params.id);
        res.json({ success: true, ...result });
      })
    );

    // Pipeline Stages
    router.get('/pipelines/:pipelineId/stages',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await stageRepo.findByPipeline(req.params.pipelineId);
        res.json({ success: true, data });
      })
    );

    router.post('/pipelines/:pipelineId/stages',
      authorize(ROLES.ADMIN),
      asyncHandler(async (req, res) => {
        const data = await stageRepo.create({ ...req.body, pipeline_id: req.params.pipelineId, company_id: req.companyId });
        res.status(201).json({ success: true, data });
      })
    );

    router.put('/pipelines/:pipelineId/stages/:stageId',
      authorize(ROLES.ADMIN),
      asyncHandler(async (req, res) => {
        const data = await stageRepo.update(req.params.stageId, req.body);
        res.json({ success: true, data });
      })
    );

    router.delete('/pipelines/:pipelineId/stages/:stageId',
      authorize(ROLES.ADMIN),
      asyncHandler(async (req, res) => {
        const result = await stageRepo.delete(req.params.stageId);
        res.json({ success: true, ...result });
      })
    );

    // Leads
    router.get('/leads',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const result = await leadRepo.findAll(req.companyId, req.query);
        res.json({ success: true, ...result });
      })
    );

    router.get('/leads/:id',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await leadRepo.findById(req.params.id, req.companyId);
        if (!data) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lead no encontrado' } });
        res.json({ success: true, data });
      })
    );

    router.post('/leads',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await leadRepo.create({
          ...req.body,
          company_id: req.companyId,
          user_id: req.user.id,
        });
        res.status(201).json({ success: true, data });
      })
    );

    router.put('/leads/:id',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await leadRepo.update(req.params.id, req.body);
        res.json({ success: true, data });
      })
    );

    router.put('/leads/:id/move',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await leadRepo.moveStage(req.params.id, req.body.stage_id);
        res.json({ success: true, data });
      })
    );

    router.post('/leads/:id/convert',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await leadRepo.convertToClient(req.params.id);
        res.json({ success: true, data });
      })
    );

    router.delete('/leads/:id',
      authorize(ROLES.ADMIN),
      asyncHandler(async (req, res) => {
        const result = await leadRepo.delete(req.params.id);
        res.json({ success: true, ...result });
      })
    );

    // Lead Activities
    router.get('/leads/:leadId/activities',
      asyncHandler(async (req, res) => {
        const data = await activityRepo.findByLead(req.params.leadId);
        res.json({ success: true, data });
      })
    );

    router.post('/leads/:leadId/activities',
      asyncHandler(async (req, res) => {
        const data = await activityRepo.create({
          ...req.body,
          lead_id: req.params.leadId,
          company_id: req.companyId,
          user_id: req.user.id,
        });
        res.status(201).json({ success: true, data });
      })
    );

    // Lead Notes
    router.get('/leads/:leadId/notes',
      asyncHandler(async (req, res) => {
        const data = await noteRepo.findByLead(req.params.leadId);
        res.json({ success: true, data });
      })
    );

    router.post('/leads/:leadId/notes',
      asyncHandler(async (req, res) => {
        const data = await noteRepo.create({
          ...req.body,
          lead_id: req.params.leadId,
          company_id: req.companyId,
          user_id: req.user.id,
        });
        res.status(201).json({ success: true, data });
      })
    );

    // Lead Sources
    router.get('/lead-sources',
      asyncHandler(async (req, res) => {
        const data = await sourceRepo.findAll(req.companyId);
        res.json({ success: true, data });
      })
    );

    // Tasks
    router.get('/tasks',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const result = await taskRepo.findAll(req.companyId, req.query);
        res.json({ success: true, ...result });
      })
    );

    router.post('/tasks',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await taskRepo.create({
          ...req.body,
          company_id: req.companyId,
          created_by: req.user.id,
        });
        res.status(201).json({ success: true, data });
      })
    );

    router.put('/tasks/:id',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await taskRepo.update(req.params.id, req.body);
        res.json({ success: true, data });
      })
    );

    router.put('/tasks/:id/complete',
      authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
      asyncHandler(async (req, res) => {
        const data = await taskRepo.complete(req.params.id);
        res.json({ success: true, data });
      })
    );
  }

  return router;
}
