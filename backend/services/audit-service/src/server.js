const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const { auditRouter } = require('./routes/audit.routes');

const app = express();
const PORT = process.env.AUDIT_SERVICE_PORT || 3017;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'audit-service' });
});

app.use('/api/audit', auditRouter);

app.use((err, req, res, next) => {
  console.error('[AuditService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.errorCode || 'INTERNAL_ERROR', message: err.message || 'Error en auditoría' }
  });
});

app.listen(PORT, () => {
  console.log(`📋 Audit Service corriendo en puerto ${PORT}`);
});

module.exports = app;
