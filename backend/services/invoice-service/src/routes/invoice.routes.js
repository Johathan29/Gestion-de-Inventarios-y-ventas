const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('@inventory/shared');
const { PERMISSIONS } = require('@inventory/shared');
const {
  getInvoices, getInvoiceById, generateInvoice,
  generateInvoicePDF, sendInvoiceEmail, updatePaymentStatus
} = require('../controllers/invoice.controller');

router.use(authenticate());

router.get('/', hasPermission(PERMISSIONS.INVOICE_READ), getInvoices);
router.get('/:id', hasPermission(PERMISSIONS.INVOICE_READ), getInvoiceById);
router.post('/generate', hasPermission(PERMISSIONS.INVOICE_CREATE), generateInvoice);
router.get('/:id/pdf', hasPermission(PERMISSIONS.INVOICE_READ), generateInvoicePDF);
router.post('/:id/send-email', hasPermission(PERMISSIONS.INVOICE_SEND), sendInvoiceEmail);
router.patch('/:id/payment-status', hasPermission(PERMISSIONS.INVOICE_UPDATE), updatePaymentStatus);

module.exports = { invoiceRouter: router };
