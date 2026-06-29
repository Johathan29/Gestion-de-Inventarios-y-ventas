const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const { userRouter } = require('./routes/user.routes');

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3002;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

app.use('/api/users', userRouter);

app.use((err, req, res, next) => {
  console.error('[UserService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servicio de usuarios'
    }
  });
});

app.listen(PORT, () => {
  console.log(`👤 User Service corriendo en puerto ${PORT}`);
});

module.exports = app;
