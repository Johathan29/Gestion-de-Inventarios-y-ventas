const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const { tenantContext } = require('@inventory/shared');
const { productRouter } = require('./routes/product.routes');

const app = express();
const PORT = process.env.PRODUCT_SERVICE_PORT || 3003;

app.use(express.json({ limit: '50mb' }));
app.use(tenantContext);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'product-service' });
});

app.use('/api/products', productRouter);

app.use((err, req, res, next) => {
  console.error('[ProductService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servicio de productos'
    }
  });
});

app.listen(PORT, () => {
  console.log(`📦 Product Service corriendo en puerto ${PORT}`);
});

module.exports = app;





