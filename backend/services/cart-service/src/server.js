const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const { cartRouter } = require('./routes/cart.routes');

const app = express();
const PORT = process.env.CART_SERVICE_PORT || 3010;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cart-service' });
});

app.use('/api/cart', cartRouter);

app.use((err, req, res, next) => {
  console.error('[CartService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.errorCode || 'INTERNAL_ERROR', message: err.message || 'Error interno del servicio de carrito' }
  });
});

app.listen(PORT, () => {
  console.log(`🛒 Cart Service corriendo en puerto ${PORT}`);
});

module.exports = app;
