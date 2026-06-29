const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('@inventory/shared');
const { PERMISSIONS } = require('@inventory/shared');
const {
  getUserNotifications, markAsRead, markAllAsRead,
  deleteNotification, createNotification
} = require('../controllers/notification.controller');

// Rutas de usuario
router.get('/', authenticate(), getUserNotifications);
router.put('/:id/read', authenticate(), markAsRead);
router.put('/read-all', authenticate(), markAllAsRead);
router.delete('/:id', authenticate(), deleteNotification);

// Ruta interna (admin)
router.post('/', authenticate(), hasPermission(PERMISSIONS.ADMIN_ACCESS), createNotification);

module.exports = { notificationRouter: router };
