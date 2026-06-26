const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const { notificationRouter } = require('./routes/notification.routes');

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3016;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.use('/api/notifications', notificationRouter);

app.use((err, req, res, next) => {
  console.error('[NotificationService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.errorCode || 'INTERNAL_ERROR', message: err.message || 'Error en notificaciones' }
  });
});

app.listen(PORT, () => {
  console.log(`🔔 Notification Service corriendo en puerto ${PORT}`);
});

module.exports = app;
