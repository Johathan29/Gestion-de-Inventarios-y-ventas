const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const { whatsappRouter } = require('./routes/whatsapp.routes');

const app = express();
const PORT = process.env.WHATSAPP_SERVICE_PORT || 3015;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'whatsapp-service' });
});

app.use('/api/whatsapp', whatsappRouter);

app.use((err, req, res, next) => {
  console.error('[WhatsAppService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.errorCode || 'INTERNAL_ERROR', message: err.message || 'Error en servicio de WhatsApp' }
  });
});

app.listen(PORT, () => {
  console.log(`💬 WhatsApp Service corriendo en puerto ${PORT}`);
});

module.exports = app;
