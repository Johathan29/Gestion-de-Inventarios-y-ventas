const express = require('express');
const router = express.Router();
const { searchCatalog, getCatalogProduct } = require('../controllers/catalog.controller');

// Rutas públicas
router.get('/search', searchCatalog);
router.get('/products/:id', getCatalogProduct);

module.exports = { catalogRouter: router };
