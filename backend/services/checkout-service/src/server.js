const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const { checkoutRouter } = require('./routes/checkout.routes');

const app = express();
const PORT = process.env.CHECKOUT_SERVICE_PORT || 3011;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'checkout-service' });
});

app.use('/api/checkout', checkoutRouter);

app.use((err, req, res, next) => {
  console.error('[CheckoutService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.errorCode || 'INTERNAL_ERROR', message: err.message || 'Error en el checkout' }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Checkout Service corriendo en puerto ${PORT}`);
});

module.exports = app;
