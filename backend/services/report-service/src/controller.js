// ============================================================
// Reporting Controller — Express Routes
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, validate, asyncHandler } from '@erp/common';
import { ROLES } from '@erp/common';
import { SalesReportQueryDTO, InventoryReportQueryDTO, TopProductsQueryDTO, ClientReportQueryDTO } from './DTOs/index.js';

export function createReportRouter(appService) {
  const router = Router();

  router.use(authenticate);
  router.use(authorize(ROLES.ADMIN, ROLES.SUPERVISOR));

  router.get('/dashboard',
    asyncHandler(async (req, res) => {
      const stats = await appService.getDashboardStats();
      res.json({ success: true, data: stats });
    })
  );

  router.get('/sales',
    validate(SalesReportQueryDTO, 'query'),
    asyncHandler(async (req, res) => {
      const report = await appService.getSalesReport(req.validatedQuery);
      res.json({ success: true, data: report });
    })
  );

  router.get('/sales-chart',
    asyncHandler(async (req, res) => {
      const data = await appService.getSalesChartData();
      res.json({ success: true, data });
    })
  );

  router.get('/inventory',
    validate(InventoryReportQueryDTO, 'query'),
    asyncHandler(async (req, res) => {
      const report = await appService.getInventoryReport(req.validatedQuery);
      res.json({ success: true, data: report });
    })
  );

  router.get('/top-products',
    validate(TopProductsQueryDTO, 'query'),
    asyncHandler(async (req, res) => {
      const products = await appService.getTopProducts(req.validatedQuery);
      res.json({ success: true, data: products });
    })
  );

  router.get('/clients',
    validate(ClientReportQueryDTO, 'query'),
    asyncHandler(async (req, res) => {
      const report = await appService.getClientReport(req.validatedQuery);
      res.json({ success: true, data: report });
    })
  );

  return router;
}
