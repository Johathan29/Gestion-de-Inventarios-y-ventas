// ============================================================
// Configuration Application Service — Façade
// ============================================================

import {
  GetConfigUseCase, GetConfigSectionsUseCase, UpdateConfigUseCase, BulkUpdateConfigUseCase,
  GetEcommerceSettingsUseCase, UpdateEcommerceSettingsUseCase,
  ListTaxRatesUseCase, GetTaxRateUseCase, CreateTaxRateUseCase, UpdateTaxRateUseCase, DeleteTaxRateUseCase,
  ListHeroSlidesUseCase, GetHeroSlideUseCase, CreateHeroSlideUseCase, UpdateHeroSlideUseCase, ReorderHeroSlidesUseCase, DeleteHeroSlideUseCase,
  ListFloatingBannersUseCase, GetFloatingBannerUseCase, CreateFloatingBannerUseCase, UpdateFloatingBannerUseCase, DeleteFloatingBannerUseCase,
  GetWhatsAppConfigUseCase, UpdateWhatsAppConfigUseCase,
} from '../usecases/index.js';

export class ConfigApplicationService {
  constructor({ configRepo, ecommerceRepo, taxRateRepo, heroSlideRepo, bannerRepo, whatsappRepo, eventBus }) {
    this._getConfig = new GetConfigUseCase({ configRepo });
    this._getSections = new GetConfigSectionsUseCase({ configRepo });
    this._updateConfig = new UpdateConfigUseCase({ configRepo });
    this._bulkUpdateConfig = new BulkUpdateConfigUseCase({ configRepo });

    this._getEcommerce = new GetEcommerceSettingsUseCase({ ecommerceRepo });
    this._updateEcommerce = new UpdateEcommerceSettingsUseCase({ ecommerceRepo });

    this._listTaxRates = new ListTaxRatesUseCase({ taxRateRepo });
    this._getTaxRate = new GetTaxRateUseCase({ taxRateRepo });
    this._createTaxRate = new CreateTaxRateUseCase({ taxRateRepo, eventBus });
    this._updateTaxRate = new UpdateTaxRateUseCase({ taxRateRepo, eventBus });
    this._deleteTaxRate = new DeleteTaxRateUseCase({ taxRateRepo, eventBus });

    this._listHeroSlides = new ListHeroSlidesUseCase({ heroSlideRepo });
    this._getHeroSlide = new GetHeroSlideUseCase({ heroSlideRepo });
    this._createHeroSlide = new CreateHeroSlideUseCase({ heroSlideRepo, eventBus });
    this._updateHeroSlide = new UpdateHeroSlideUseCase({ heroSlideRepo, eventBus });
    this._reorderHeroSlides = new ReorderHeroSlidesUseCase({ heroSlideRepo, eventBus });
    this._deleteHeroSlide = new DeleteHeroSlideUseCase({ heroSlideRepo, eventBus });

    this._listBanners = new ListFloatingBannersUseCase({ bannerRepo });
    this._getBanner = new GetFloatingBannerUseCase({ bannerRepo });
    this._createBanner = new CreateFloatingBannerUseCase({ bannerRepo, eventBus });
    this._updateBanner = new UpdateFloatingBannerUseCase({ bannerRepo, eventBus });
    this._deleteBanner = new DeleteFloatingBannerUseCase({ bannerRepo, eventBus });

    this._getWhatsApp = new GetWhatsAppConfigUseCase({ whatsappRepo });
    this._updateWhatsApp = new UpdateWhatsAppConfigUseCase({ whatsappRepo, eventBus });
  }

  // System Config
  getConfig(q) { return this._getConfig.execute(q); }
  getSections() { return this._getSections.execute(); }
  updateConfig(d) { return this._updateConfig.execute(d); }
  bulkUpdateConfig(d) { return this._bulkUpdateConfig.execute(d); }

  // Ecommerce
  getEcommerceSettings() { return this._getEcommerce.execute(); }
  updateEcommerceSettings(d) { return this._updateEcommerce.execute(d); }

  // Tax Rates
  listTaxRates(q) { return this._listTaxRates.execute(q); }
  getTaxRate(id) { return this._getTaxRate.execute(id); }
  createTaxRate(d) { return this._createTaxRate.execute(d); }
  updateTaxRate(id, d) { return this._updateTaxRate.execute(id, d); }
  deleteTaxRate(id) { return this._deleteTaxRate.execute(id); }

  // Hero Slides
  listHeroSlides(q) { return this._listHeroSlides.execute(q); }
  getHeroSlide(id) { return this._getHeroSlide.execute(id); }
  createHeroSlide(d) { return this._createHeroSlide.execute(d); }
  updateHeroSlide(id, d) { return this._updateHeroSlide.execute(id, d); }
  reorderHeroSlides(d) { return this._reorderHeroSlides.execute(d.order); }
  deleteHeroSlide(id) { return this._deleteHeroSlide.execute(id); }

  // Floating Banners
  listBanners(q) { return this._listBanners.execute(q); }
  getBanner(id) { return this._getBanner.execute(id); }
  createBanner(d) { return this._createBanner.execute(d); }
  updateBanner(id, d) { return this._updateBanner.execute(id, d); }
  deleteBanner(id) { return this._deleteBanner.execute(id); }

  // WhatsApp
  getWhatsAppConfig() { return this._getWhatsApp.execute(); }
  updateWhatsAppConfig(d) { return this._updateWhatsApp.execute(d); }
}
