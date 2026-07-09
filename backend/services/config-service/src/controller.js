// ============================================================
// Configuration Controller — Express Routes
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, validate, asyncHandler } from '@erp/common';
import { ROLES } from '@erp/common';
import {
  GetConfigQueryDTO, UpdateConfigDTO, BulkUpdateConfigDTO,
  UpdateEcommerceSettingsDTO,
  CreateTaxRateDTO, UpdateTaxRateDTO,
  CreateHeroSlideDTO, UpdateHeroSlideDTO, ReorderHeroSlidesDTO,
  CreateFloatingBannerDTO, UpdateFloatingBannerDTO,
  UpdateWhatsAppConfigDTO,
} from './DTOs/index.js';

export function createConfigRouter(appService) {
  const router = Router();

  router.use(authenticate);
  router.use(authorize(ROLES.ADMIN, ROLES.SUPERVISOR));

  // ============================================================
  // System Config
  // ============================================================
  router.get('/system',
    validate(GetConfigQueryDTO, 'query'),
    asyncHandler(async (req, res) => {
      const configs = await appService.getConfig(req.validatedQuery);
      res.json({ success: true, data: configs });
    })
  );

  router.get('/system/sections',
    asyncHandler(async (req, res) => {
      const sections = await appService.getSections();
      res.json({ success: true, data: sections });
    })
  );

  router.put('/system',
    validate(UpdateConfigDTO),
    asyncHandler(async (req, res) => {
      const config = await appService.updateConfig(req.validatedBody);
      res.json({ success: true, data: config });
    })
  );

  router.post('/system/bulk',
    validate(BulkUpdateConfigDTO),
    asyncHandler(async (req, res) => {
      const results = await appService.bulkUpdateConfig(req.validatedBody);
      res.json({ success: true, data: results });
    })
  );

  // ============================================================
  // Ecommerce Settings (Singleton)
  // ============================================================
  router.get('/ecommerce',
    asyncHandler(async (req, res) => {
      const settings = await appService.getEcommerceSettings();
      res.json({ success: true, data: settings });
    })
  );

  router.put('/ecommerce',
    validate(UpdateEcommerceSettingsDTO),
    asyncHandler(async (req, res) => {
      const settings = await appService.updateEcommerceSettings(req.validatedBody);
      res.json({ success: true, data: settings });
    })
  );

  // ============================================================
  // Tax Rates
  // ============================================================
  router.get('/tax-rates',
    asyncHandler(async (req, res) => {
      const query = {};
      if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
      const rates = await appService.listTaxRates(query);
      res.json({ success: true, data: rates });
    })
  );

  router.get('/tax-rates/:id',
    asyncHandler(async (req, res) => {
      const rate = await appService.getTaxRate(req.params.id);
      if (!rate) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tax rate not found' } });
      res.json({ success: true, data: rate });
    })
  );

  router.post('/tax-rates',
    validate(CreateTaxRateDTO),
    asyncHandler(async (req, res) => {
      const rate = await appService.createTaxRate(req.validatedBody);
      res.status(201).json({ success: true, data: rate });
    })
  );

  router.put('/tax-rates/:id',
    validate(UpdateTaxRateDTO),
    asyncHandler(async (req, res) => {
      const rate = await appService.updateTaxRate(req.params.id, req.validatedBody);
      res.json({ success: true, data: rate });
    })
  );

  router.delete('/tax-rates/:id',
    asyncHandler(async (req, res) => {
      await appService.deleteTaxRate(req.params.id);
      res.json({ success: true, message: 'Tax rate deleted' });
    })
  );

  // ============================================================
  // Hero Slides (Ecommerce Carousel)
  // ============================================================
  router.get('/hero-slides',
    asyncHandler(async (req, res) => {
      const query = {};
      if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
      const slides = await appService.listHeroSlides(query);
      res.json({ success: true, data: slides });
    })
  );

  router.get('/hero-slides/:id',
    asyncHandler(async (req, res) => {
      const slide = await appService.getHeroSlide(req.params.id);
      if (!slide) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Hero slide not found' } });
      res.json({ success: true, data: slide });
    })
  );

  router.post('/hero-slides',
    validate(CreateHeroSlideDTO),
    asyncHandler(async (req, res) => {
      const slide = await appService.createHeroSlide(req.validatedBody);
      res.status(201).json({ success: true, data: slide });
    })
  );

  router.put('/hero-slides/:id',
    validate(UpdateHeroSlideDTO),
    asyncHandler(async (req, res) => {
      const slide = await appService.updateHeroSlide(req.params.id, req.validatedBody);
      res.json({ success: true, data: slide });
    })
  );

  router.put('/hero-slides/reorder',
    validate(ReorderHeroSlidesDTO),
    asyncHandler(async (req, res) => {
      const slides = await appService.reorderHeroSlides(req.validatedBody);
      res.json({ success: true, data: slides });
    })
  );

  router.delete('/hero-slides/:id',
    asyncHandler(async (req, res) => {
      await appService.deleteHeroSlide(req.params.id);
      res.json({ success: true, message: 'Hero slide deleted' });
    })
  );

  // ============================================================
  // Floating Banners
  // ============================================================
  router.get('/floating-banners',
    asyncHandler(async (req, res) => {
      const query = {};
      if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
      const banners = await appService.listBanners(query);
      res.json({ success: true, data: banners });
    })
  );

  router.get('/floating-banners/:id',
    asyncHandler(async (req, res) => {
      const banner = await appService.getBanner(req.params.id);
      if (!banner) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Banner not found' } });
      res.json({ success: true, data: banner });
    })
  );

  router.post('/floating-banners',
    validate(CreateFloatingBannerDTO),
    asyncHandler(async (req, res) => {
      const banner = await appService.createBanner(req.validatedBody);
      res.status(201).json({ success: true, data: banner });
    })
  );

  router.put('/floating-banners/:id',
    validate(UpdateFloatingBannerDTO),
    asyncHandler(async (req, res) => {
      const banner = await appService.updateBanner(req.params.id, req.validatedBody);
      res.json({ success: true, data: banner });
    })
  );

  router.delete('/floating-banners/:id',
    asyncHandler(async (req, res) => {
      await appService.deleteBanner(req.params.id);
      res.json({ success: true, message: 'Banner deleted' });
    })
  );

  // ============================================================
  // WhatsApp Config
  // ============================================================
  router.get('/whatsapp',
    asyncHandler(async (req, res) => {
      const config = await appService.getWhatsAppConfig();
      res.json({ success: true, data: config });
    })
  );

  router.put('/whatsapp',
    validate(UpdateWhatsAppConfigDTO),
    asyncHandler(async (req, res) => {
      const config = await appService.updateWhatsAppConfig(req.validatedBody);
      res.json({ success: true, data: config });
    })
  );

  return router;
}
