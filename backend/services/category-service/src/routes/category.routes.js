const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../../../../shared/middleware/auth');
const { PERMISSIONS } = require('../../../../shared/types/roles');
const {
  getCategories, getCategoryById, createCategory,
  updateCategory, deleteCategory
} = require('../controllers/category.controller');

// Rutas públicas (solo lectura)
router.get('/', authenticate(false), getCategories);
router.get('/:id', authenticate(false), getCategoryById);

// Rutas protegidas
router.post('/', authenticate(), hasPermission(PERMISSIONS.CATEGORY_CREATE), createCategory);
router.put('/:id', authenticate(), hasPermission(PERMISSIONS.CATEGORY_UPDATE), updateCategory);
router.delete('/:id', authenticate(), hasPermission(PERMISSIONS.CATEGORY_DELETE), deleteCategory);

module.exports = { categoryRouter: router };
