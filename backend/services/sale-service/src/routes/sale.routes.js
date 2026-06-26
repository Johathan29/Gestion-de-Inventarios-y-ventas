const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../../../../shared/middleware/auth');
const { PERMISSIONS } = require('../../../../shared/types/roles');
const { getSales, getSaleById, createSale, cancelSale, getClientSales } = require('../controllers/sale.controller');

router.use(authenticate());

router.get('/client', getClientSales);
router.get('/', hasPermission(PERMISSIONS.SALE_READ), getSales);
router.get('/:id', hasPermission(PERMISSIONS.SALE_READ), getSaleById);
router.post('/', hasPermission(PERMISSIONS.SALE_CREATE), createSale);
router.post('/:id/cancel', hasPermission(PERMISSIONS.SALE_CANCEL), cancelSale);

module.exports = { saleRouter: router };
