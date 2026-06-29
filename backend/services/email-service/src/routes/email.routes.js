const express = require('express');
const router = express.Router();
const { authenticate } = require('@inventory/shared');
const { sendEmail, sendInvoiceEmail, sendPurchaseConfirmation } = require('../controllers/email.controller');

router.use(authenticate());

router.post('/send', sendEmail);
router.post('/invoice/:invoice_id', sendInvoiceEmail);
router.post('/purchase-confirmation', sendPurchaseConfirmation);

module.exports = { emailRouter: router };
