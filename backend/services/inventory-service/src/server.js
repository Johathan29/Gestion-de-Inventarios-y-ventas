const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const { inventoryRouter } = require('./routes/inventory.routes');

const app = express();
const PORT = process.env.INVENTORY_SERVICE_PORT || 3005;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'inventory-service' });
});

app.use('/api/inventory', inventoryRouter);

app.use((err, req, res, next) => {
  console.error('[InventoryService] Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servicio de inventario'
    }
  });
});

app.listen(PORT, () => {
  console.log(`📊 Inventory Service corriendo en puerto ${PORT}`);
});

module.exports = app;
