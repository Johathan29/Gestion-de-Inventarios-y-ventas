const express = require('express');
const router = express.Router();
const { authenticate } = require('@inventory/shared');
const { sendMessage, sendOrderNotification } = require('../controllers/whatsapp.controller');

router.use(authenticate());

router.post('/send', sendMessage);
router.post('/order-notification', sendOrderNotification);

module.exports = { whatsappRouter: router };
