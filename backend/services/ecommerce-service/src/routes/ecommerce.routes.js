const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('@inventory/shared');
const { PERMISSIONS } = require('@inventory/shared');
const {
  getBanners, createBanner, updateBanner, deleteBanner,
  getOffers, createOffer, updateOffer, deleteOffer,
  getHomeData, getPublicProducts, getPublicCategories, updateHomeSettings, getHomeSettings,
  getHeroSettings, updateHeroSettings,
  getProductReviews, getFeaturedReviews, createProductReview,
  getAllReviews, moderateReview, deleteReview,
  getHeroSlides, getAllHeroSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide,
  getFloatingBanners, getAllFloatingBanners, createFloatingBanner, updateFloatingBanner, deleteFloatingBanner,
  getTaxRates, getAllTaxRates, createTaxRate, updateTaxRate, deleteTaxRate,
  getWhatsappConfig, updateWhatsappConfig,
  createContactMessage,
  getActivePromotions
} = require('../controllers/ecommerce.controller');

// Rutas públicas
router.get('/home', getHomeData);
router.get('/products', getPublicProducts);
router.get('/categories', getPublicCategories);
router.get('/banners', getBanners);
router.get('/offers', getOffers);
router.get('/promotions/active', getActivePromotions);
router.get('/settings', getHomeSettings);
router.get('/hero', getHeroSettings);
router.get('/hero-slides', getHeroSlides);
router.get('/floating-banners', getFloatingBanners);
router.get('/tax-rates', getTaxRates);
router.get('/whatsapp-config', getWhatsappConfig);
router.get('/reviews/featured', getFeaturedReviews);
router.get('/reviews/product/:productId', getProductReviews);

// Rutas públicas (crear review)
router.post('/reviews', createProductReview);

// Contact form (público)
router.post('/contact', createContactMessage);

// Rutas protegidas (Admin) - Banners
router.post('/banners', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), createBanner);
router.put('/banners/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), updateBanner);
router.delete('/banners/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), deleteBanner);

// Ofertas
router.post('/offers', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), createOffer);
router.put('/offers/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), updateOffer);
router.delete('/offers/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), deleteOffer);

// Settings
router.put('/settings', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), updateHomeSettings);

// Hero (legacy)
router.put('/hero', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), updateHeroSettings);

// Hero Carousel Slides
router.get('/hero-slides/all', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), getAllHeroSlides);
router.post('/hero-slides', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), createHeroSlide);
router.put('/hero-slides/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), updateHeroSlide);
router.delete('/hero-slides/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), deleteHeroSlide);

// Floating Banners (admin)
router.get('/floating-banners/all', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), getAllFloatingBanners);
router.post('/floating-banners', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), createFloatingBanner);
router.put('/floating-banners/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), updateFloatingBanner);
router.delete('/floating-banners/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), deleteFloatingBanner);

// Tax Rates (admin)
router.get('/tax-rates/all', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), getAllTaxRates);
router.post('/tax-rates', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), createTaxRate);
router.put('/tax-rates/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), updateTaxRate);
router.delete('/tax-rates/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), deleteTaxRate);

// WhatsApp Config (admin)
router.put('/whatsapp-config', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), updateWhatsappConfig);

// Reviews (admin)
router.get('/reviews', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), getAllReviews);
router.put('/reviews/:id/moderate', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), moderateReview);
router.delete('/reviews/:id', authenticate(), hasPermission(PERMISSIONS.ECOMMERCE_MANAGE), deleteReview);

module.exports = { ecommerceRouter: router };
