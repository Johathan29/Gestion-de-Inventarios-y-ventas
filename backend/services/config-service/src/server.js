const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const { configRouter } = require('./routes/config.routes');

const app = express();
const PORT = process.env.CONFIG_SERVICE_PORT || 3018;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'config-service' });
});

app.use('/api/config', configRouter);

app.use((err, req, res, next) => {
  console.error('[ConfigService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.errorCode || 'INTERNAL_ERROR', message: err.message || 'Error en configuración' }
  });
});

app.listen(PORT, () => {
  console.log(`⚙️ Config Service corriendo en puerto ${PORT}`);
});

module.exports = app;
