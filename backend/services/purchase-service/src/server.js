const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const { purchaseRouter } = require('./routes/purchase.routes');
const { supplierRouter } = require('./routes/supplier.routes');

const app = express();
const PORT = process.env.PURCHASE_SERVICE_PORT || 3006;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'purchase-service' });
});

app.use('/api/purchases/suppliers', supplierRouter);
app.use('/api/purchases', purchaseRouter);

app.use((err, req, res, next) => {
  console.error('[PurchaseService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servicio de compras'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🛒 Purchase Service corriendo en puerto ${PORT}`);
});

module.exports = app;
