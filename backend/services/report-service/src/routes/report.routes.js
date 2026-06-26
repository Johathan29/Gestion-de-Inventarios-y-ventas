const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../../../../shared/middleware/auth');
const { PERMISSIONS } = require('../../../../shared/types/roles');
const {
  getDashboardStats, getSalesReport, getInventoryReport, getTopProducts, getClientReport, getSalesChartData
} = require('../controllers/report.controller');

router.use(authenticate());

router.get('/dashboard', hasPermission(PERMISSIONS.REPORT_READ), getDashboardStats);
router.get('/sales', hasPermission(PERMISSIONS.REPORT_READ), getSalesReport);
router.get('/sales-chart', hasPermission(PERMISSIONS.REPORT_READ), getSalesChartData);
router.get('/inventory', hasPermission(PERMISSIONS.REPORT_READ), getInventoryReport);
router.get('/top-products', hasPermission(PERMISSIONS.REPORT_READ), getTopProducts);
router.get('/clients', hasPermission(PERMISSIONS.REPORT_READ), getClientReport);

module.exports = { reportRouter: router };
