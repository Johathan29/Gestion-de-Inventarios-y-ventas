const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const { tenantContext } = require('@inventory/shared');
const { emailRouter } = require('./routes/email.routes');

const app = express();
const PORT = process.env.EMAIL_SERVICE_PORT || 3014;

app.use(express.json());
app.use(tenantContext);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-service' });
});

app.use('/api/email', emailRouter);

app.use((err, req, res, next) => {
  console.error('[EmailService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.errorCode || 'INTERNAL_ERROR', message: err.message || 'Error en servicio de correos' }
  });
});

app.listen(PORT, () => {
  console.log(`📧 Email Service corriendo en puerto ${PORT}`);
});

module.exports = app;
