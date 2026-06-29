const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('@inventory/shared');
const { PERMISSIONS } = require('@inventory/shared');
const { getConfig, updateConfig, bulkUpdateConfig, getSections } = require('../controllers/config.controller');

router.use(authenticate());
router.use(hasPermission(PERMISSIONS.ADMIN_ACCESS));

router.get('/', getConfig);
router.get('/sections', getSections);
router.put('/', updateConfig);
router.post('/bulk', bulkUpdateConfig);

module.exports = { configRouter: router };
