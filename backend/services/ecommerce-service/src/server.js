const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const { ecommerceRouter } = require('./routes/ecommerce.routes');

const app = express();
const PORT = process.env.ECOMMERCE_SERVICE_PORT || 3012;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ecommerce-service' });
});

app.use('/api/ecommerce', ecommerceRouter);

app.use((err, req, res, next) => {
  console.error('[EcommerceService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.errorCode || 'INTERNAL_ERROR', message: err.message || 'Error en ecommerce' }
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Ecommerce Service corriendo en puerto ${PORT}`);
});

module.exports = app;
