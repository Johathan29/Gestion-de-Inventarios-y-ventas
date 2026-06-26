const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const { saleRouter } = require('./routes/sale.routes');

const app = express();
const PORT = process.env.SALE_SERVICE_PORT || 3007;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sale-service' });
});

app.use('/api/sales', saleRouter);

app.use((err, req, res, next) => {
  console.error('[SaleService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servicio de ventas'
    }
  });
});

app.listen(PORT, () => {
  console.log(`💰 Sale Service corriendo en puerto ${PORT}`);
});

module.exports = app;
