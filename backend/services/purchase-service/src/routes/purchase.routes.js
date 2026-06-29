const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('@inventory/shared');
const { PERMISSIONS } = require('@inventory/shared');
const {
  getPurchases, getPurchaseById, createPurchase, getNextPurchaseNumber,
  updatePurchaseStatus, cancelPurchase, sendToInventory,
  updatePurchaseItem, deletePurchaseItem
} = require('../controllers/purchase.controller');

router.use(authenticate());

router.get('/next-number', hasPermission(PERMISSIONS.PURCHASE_READ), getNextPurchaseNumber);
router.get('/', hasPermission(PERMISSIONS.PURCHASE_READ), getPurchases);
router.get('/:id', hasPermission(PERMISSIONS.PURCHASE_READ), getPurchaseById);
router.post('/', hasPermission(PERMISSIONS.PURCHASE_CREATE), createPurchase);
router.patch('/:id/status', hasPermission(PERMISSIONS.PURCHASE_UPDATE), updatePurchaseStatus);
router.post('/:id/cancel', hasPermission(PERMISSIONS.PURCHASE_CANCEL), cancelPurchase);
router.post('/:id/send-to-inventory', hasPermission(PERMISSIONS.PURCHASE_UPDATE), sendToInventory);
router.put('/:id/items/:itemId', hasPermission(PERMISSIONS.PURCHASE_UPDATE), updatePurchaseItem);
router.delete('/:id/items/:itemId', hasPermission(PERMISSIONS.PURCHASE_UPDATE), deletePurchaseItem);

module.exports = { purchaseRouter: router };
