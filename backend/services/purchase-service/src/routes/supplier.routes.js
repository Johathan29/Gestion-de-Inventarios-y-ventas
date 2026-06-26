const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../../../../shared/middleware/auth');
const { PERMISSIONS } = require('../../../../shared/types/roles');
const {
  getSuppliers, getSupplierById, createSupplier,
  updateSupplier, deleteSupplier
} = require('../controllers/supplier.controller');

router.use(authenticate());

router.get('/', hasPermission(PERMISSIONS.PURCHASE_READ), getSuppliers);
router.get('/:id', hasPermission(PERMISSIONS.PURCHASE_READ), getSupplierById);
router.post('/', hasPermission(PERMISSIONS.PURCHASE_CREATE), createSupplier);
router.put('/:id', hasPermission(PERMISSIONS.PURCHASE_UPDATE), updateSupplier);
router.delete('/:id', hasPermission(PERMISSIONS.INVENTORY_ADJUST), deleteSupplier);

module.exports = { supplierRouter: router };
