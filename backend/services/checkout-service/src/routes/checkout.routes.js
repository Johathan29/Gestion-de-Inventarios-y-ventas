const express = require('express');
const router = express.Router();
const { authenticate } = require('@inventory/shared');
const { processCheckout, getPaymentMethods } = require('../controllers/checkout.controller');

router.use(authenticate());

router.post('/', processCheckout);
router.get('/payment-methods', getPaymentMethods);

module.exports = { checkoutRouter: router };
