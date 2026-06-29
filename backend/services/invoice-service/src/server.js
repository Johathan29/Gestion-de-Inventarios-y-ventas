const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const { invoiceRouter } = require('./routes/invoice.routes');

const app = express();
const PORT = process.env.INVOICE_SERVICE_PORT || 3009;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'invoice-service' });
});

app.use('/api/invoices', invoiceRouter);

app.use((err, req, res, next) => {
  console.error('[InvoiceService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servicio de facturación'
    }
  });
});

app.listen(PORT, () => {
  console.log(`📄 Invoice Service corriendo en puerto ${PORT}`);
});

module.exports = app;
