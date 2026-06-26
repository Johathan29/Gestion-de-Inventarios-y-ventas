const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../../../../shared/middleware/auth');
const { PERMISSIONS } = require('../../../../shared/types/roles');
const { getAuditLogs, logAuditEvent, getRecentActivity, getAuditStats } = require('../controllers/audit.controller');

router.use(authenticate());

router.get('/', hasPermission(PERMISSIONS.ADMIN_ACCESS), getAuditLogs);
router.get('/recent', getRecentActivity);
router.get('/stats', hasPermission(PERMISSIONS.ADMIN_ACCESS), getAuditStats);

// Ruta interna para registro
router.post('/log', hasPermission(PERMISSIONS.ADMIN_ACCESS), logAuditEvent);

module.exports = { auditRouter: router };
