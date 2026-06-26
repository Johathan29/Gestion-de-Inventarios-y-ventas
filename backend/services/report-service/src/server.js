const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const { reportRouter } = require('./routes/report.routes');

const app = express();
const PORT = process.env.REPORT_SERVICE_PORT || 3008;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'report-service' });
});

app.use('/api/reports', reportRouter);

app.use((err, req, res, next) => {
  console.error('[ReportService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.errorCode || 'INTERNAL_ERROR', message: err.message || 'Error en reportes' }
  });
});

app.listen(PORT, () => {
  console.log(`📊 Report Service corriendo en puerto ${PORT}`);
});

module.exports = app;
