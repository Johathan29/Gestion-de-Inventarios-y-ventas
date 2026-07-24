const express = require('express');
const router = express.Router();
const { authenticate } = require('@inventory/shared');
const {
  sendEmail,
  sendWelcomeEmail,
  sendRegistrationDataEmail,
  sendPasswordResetEmail,
  sendInvoiceEmail,
  sendPurchaseConfirmation,
  sendOrderStatusUpdate,
  sendNewProductsNotification,
  sendNewOfferNotification,
  sendSaleNotification,
  sendRestockPurchaseNotification,
  sendSystemEventNotification
} = require('../controllers/email.controller');

// ─── Rutas internas (sin autenticación, para servicio→servicio) ───
router.post('/send', sendEmail);
router.post('/welcome', sendWelcomeEmail);
router.post('/registration-data', sendRegistrationDataEmail);
router.post('/password-reset', sendPasswordResetEmail);
router.post('/invoice/:invoice_id', sendInvoiceEmail);
router.post('/purchase-confirmation', sendPurchaseConfirmation);
router.post('/order-status', sendOrderStatusUpdate);
router.post('/new-products', sendNewProductsNotification);
router.post('/new-offer', sendNewOfferNotification);
router.post('/sale-notification', sendSaleNotification);
router.post('/restock-purchase', sendRestockPurchaseNotification);
router.post('/system-event', sendSystemEventNotification);

// ─── Rutas protegidas (requieren autenticación JWT) ───
// Si en el futuro se necesita exponer algún endpoint al exterior
// router.post('/protected-send', authenticate(), sendEmail);

module.exports = { emailRouter: router };
