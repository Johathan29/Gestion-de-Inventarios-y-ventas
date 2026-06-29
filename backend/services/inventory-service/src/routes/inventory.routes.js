const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('@inventory/shared');
const { PERMISSIONS } = require('@inventory/shared');
const {
  getStock, getStockByProduct, getKardex, getMovements,
  createEntry, createExit, createAdjustment, createTransfer,
  getStockAlerts, getInventorySummary
} = require('../controllers/inventory.controller');

// Todas las rutas requieren autenticación
router.use(authenticate());

// Stock
router.get('/stock', hasPermission(PERMISSIONS.INVENTORY_READ), getStock);
router.get('/stock/:productId', hasPermission(PERMISSIONS.INVENTORY_READ), getStockByProduct);

// Movimientos
router.get('/movements', hasPermission(PERMISSIONS.INVENTORY_READ), getMovements);
router.get('/kardex/:productId', hasPermission(PERMISSIONS.INVENTORY_READ), getKardex);

// Operaciones de inventario
router.post('/entries', hasPermission(PERMISSIONS.INVENTORY_CREATE), createEntry);
router.post('/exits', hasPermission(PERMISSIONS.INVENTORY_CREATE), createExit);
router.post('/adjustments', hasPermission(PERMISSIONS.INVENTORY_ADJUST), createAdjustment);
router.post('/transfers', hasPermission(PERMISSIONS.INVENTORY_TRANSFER), createTransfer);

// Alertas y resúmenes
router.get('/alerts', hasPermission(PERMISSIONS.INVENTORY_READ), getStockAlerts);
router.get('/summary', hasPermission(PERMISSIONS.INVENTORY_READ), getInventorySummary);

module.exports = { inventoryRouter: router };
