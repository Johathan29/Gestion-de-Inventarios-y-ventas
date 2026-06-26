const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate, authorize, hasPermission } = require('../../../../shared/middleware/auth');
const { ROLES, PERMISSIONS } = require('../../../../shared/types/roles');
const {
  getProducts, getProductById, createProduct, updateProduct, deleteProduct,
  getFeaturedProducts, getProductsByCategory, getLowStockProducts,
  uploadProductImage, uploadProductImageByUrl, deleteProductImage,
  getProductVariants, createProductVariant
} = require('../controllers/product.controller');

// Configuración de multer para subida de imágenes (máx 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo: JPEG, PNG, WebP, GIF, AVIF'), false);
    }
  }
});

// Rutas públicas (sin autenticación para el catálogo público)
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/low-stock', authenticate(), hasPermission(PERMISSIONS.INVENTORY_READ), getLowStockProducts);
router.get('/:id', getProductById);

// Rutas protegidas
router.post('/', authenticate(), hasPermission(PERMISSIONS.PRODUCT_CREATE), createProduct);
router.put('/:id', authenticate(), hasPermission(PERMISSIONS.PRODUCT_UPDATE), updateProduct);
router.delete('/:id', authenticate(), hasPermission(PERMISSIONS.PRODUCT_DELETE), deleteProduct);

// Variantes
router.get('/:id/variants', getProductVariants);
router.post('/:id/variants', authenticate(), hasPermission(PERMISSIONS.PRODUCT_CREATE), createProductVariant);

// Imágenes - Subida por archivo (multipart)
router.post(
  '/:id/images',
  authenticate(),
  hasPermission(PERMISSIONS.PRODUCT_UPDATE),
  upload.single('image'),
  (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: err.message }
      });
    }
    if (err) {
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: err.message }
      });
    }
    next();
  },
  uploadProductImage
);

// Imágenes - Subida por URL
router.post('/:id/images/url', authenticate(), hasPermission(PERMISSIONS.PRODUCT_UPDATE), uploadProductImageByUrl);

// Imágenes - Eliminar
router.delete('/:id/images', authenticate(), hasPermission(PERMISSIONS.PRODUCT_UPDATE), deleteProductImage);

module.exports = { productRouter: router };
