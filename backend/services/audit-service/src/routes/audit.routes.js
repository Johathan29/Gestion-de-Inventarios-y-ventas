const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('@inventory/shared');
const { PERMISSIONS } = require('@inventory/shared');
const { getAuditLogs, logAuditEvent, getRecentActivity, getAuditStats } = require('../controllers/audit.controller');

router.use(authenticate());

router.get('/', hasPermission(PERMISSIONS.AUDIT_READ), getAuditLogs);
router.get('/recent', getRecentActivity);
router.get('/stats', hasPermission(PERMISSIONS.AUDIT_READ), getAuditStats);

// Ruta interna para registro
router.post('/log', hasPermission(PERMISSIONS.AUDIT_READ), logAuditEvent);

module.exports = { auditRouter: router };
