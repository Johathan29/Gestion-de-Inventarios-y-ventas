const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const { catalogRouter } = require('./routes/catalog.routes');

const app = express();
const PORT = process.env.CATALOG_SERVICE_PORT || 3013;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'catalog-service' });
});

app.use('/api/catalog', catalogRouter);

app.use((err, req, res, next) => {
  console.error('[CatalogService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.errorCode || 'INTERNAL_ERROR', message: err.message || 'Error en el catálogo' }
  });
});

app.listen(PORT, () => {
  console.log(`📖 Catalog Service corriendo en puerto ${PORT}`);
});

module.exports = app;
