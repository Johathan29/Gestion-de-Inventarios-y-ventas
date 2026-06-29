const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const { categoryRouter } = require('./routes/category.routes');

const app = express();
const PORT = process.env.CATEGORY_SERVICE_PORT || 3004;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'category-service' });
});

app.use('/api/categories', categoryRouter);

app.use((err, req, res, next) => {
  console.error('[CategoryService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servicio de categorías'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🏷️ Category Service corriendo en puerto ${PORT}`);
});

module.exports = app;
