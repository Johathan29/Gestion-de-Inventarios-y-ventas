// ============================================================
// Configuration Use Cases
// ============================================================

// ── System Config ─────────────────────────────────────────
export class GetConfigUseCase {
  constructor({ configRepo }) { this._configRepo = configRepo; }
  async execute(query) { return this._configRepo.findAll(query); }
}

export class GetConfigSectionsUseCase {
  constructor({ configRepo }) { this._configRepo = configRepo; }
  async execute() { return this._configRepo.getSections(); }
}

export class UpdateConfigUseCase {
  constructor({ configRepo }) { this._configRepo = configRepo; }
  async execute(data) { return this._configRepo.upsert(data); }
}

export class BulkUpdateConfigUseCase {
  constructor({ configRepo }) { this._configRepo = configRepo; }
  async execute(data) { return this._configRepo.bulkUpsert(data.configs); }
}

// ── Ecommerce Settings ────────────────────────────────────
export class GetEcommerceSettingsUseCase {
  constructor({ ecommerceRepo }) { this._ecommerceRepo = ecommerceRepo; }
  async execute() { return this._ecommerceRepo.get(); }
}

export class UpdateEcommerceSettingsUseCase {
  constructor({ ecommerceRepo }) { this._ecommerceRepo = ecommerceRepo; }
  async execute(data) { return this._ecommerceRepo.upsert(data); }
}

// ── Tax Rates ─────────────────────────────────────────────
export class ListTaxRatesUseCase {
  constructor({ taxRateRepo }) { this._taxRateRepo = taxRateRepo; }
  async execute(query) { return this._taxRateRepo.findAll(query); }
}

export class GetTaxRateUseCase {
  constructor({ taxRateRepo }) { this._taxRateRepo = taxRateRepo; }
  async execute(id) { return this._taxRateRepo.findById(id); }
}

export class CreateTaxRateUseCase {
  constructor({ taxRateRepo, eventBus }) { this._taxRateRepo = taxRateRepo; this._eventBus = eventBus; }
  async execute(data) {
    const { name, code, rate, countryCode, isDefault, isActive, description } = data;
    const taxRate = new (await import('../domain/index.js')).TaxRate({
      id: undefined, name, code, rate, countryCode, isDefault, isActive, description,
    });
    const created = await this._taxRateRepo.create(taxRate);
    if (this._eventBus) this._eventBus.publish('config.tax-rate.created', { taxRate: created.toJSON() });
    return created;
  }
}

export class UpdateTaxRateUseCase {
  constructor({ taxRateRepo, eventBus }) { this._taxRateRepo = taxRateRepo; this._eventBus = eventBus; }
  async execute(id, data) {
    const updated = await this._taxRateRepo.update(id, data);
    if (this._eventBus) this._eventBus.publish('config.tax-rate.updated', { taxRate: updated.toJSON() });
    return updated;
  }
}

export class DeleteTaxRateUseCase {
  constructor({ taxRateRepo, eventBus }) { this._taxRateRepo = taxRateRepo; this._eventBus = eventBus; }
  async execute(id) {
    await this._taxRateRepo.delete(id);
    if (this._eventBus) this._eventBus.publish('config.tax-rate.deleted', { id });
  }
}

// ── Hero Slides ───────────────────────────────────────────
export class ListHeroSlidesUseCase {
  constructor({ heroSlideRepo }) { this._heroSlideRepo = heroSlideRepo; }
  async execute(query) { return this._heroSlideRepo.findAll(query); }
}

export class GetHeroSlideUseCase {
  constructor({ heroSlideRepo }) { this._heroSlideRepo = heroSlideRepo; }
  async execute(id) { return this._heroSlideRepo.findById(id); }
}

export class CreateHeroSlideUseCase {
  constructor({ heroSlideRepo, eventBus }) { this._heroSlideRepo = heroSlideRepo; this._eventBus = eventBus; }
  async execute(data) {
    const slide = new (await import('../domain/index.js')).HeroSlide({ id: undefined, ...data });
    const created = await this._heroSlideRepo.create(slide);
    if (this._eventBus) this._eventBus.publish('config.hero-slide.created', { heroSlide: created.toJSON() });
    return created;
  }
}

export class UpdateHeroSlideUseCase {
  constructor({ heroSlideRepo, eventBus }) { this._heroSlideRepo = heroSlideRepo; this._eventBus = eventBus; }
  async execute(id, data) {
    const updated = await this._heroSlideRepo.update(id, data);
    if (this._eventBus) this._eventBus.publish('config.hero-slide.updated', { heroSlide: updated.toJSON() });
    return updated;
  }
}

export class ReorderHeroSlidesUseCase {
  constructor({ heroSlideRepo, eventBus }) { this._heroSlideRepo = heroSlideRepo; this._eventBus = eventBus; }
  async execute(order) {
    const result = await this._heroSlideRepo.reorder(order);
    if (this._eventBus) this._eventBus.publish('config.hero-slide.reordered', { order });
    return result;
  }
}

export class DeleteHeroSlideUseCase {
  constructor({ heroSlideRepo, eventBus }) { this._heroSlideRepo = heroSlideRepo; this._eventBus = eventBus; }
  async execute(id) {
    await this._heroSlideRepo.delete(id);
    if (this._eventBus) this._eventBus.publish('config.hero-slide.deleted', { id });
  }
}

// ── Floating Banners ──────────────────────────────────────
export class ListFloatingBannersUseCase {
  constructor({ bannerRepo }) { this._bannerRepo = bannerRepo; }
  async execute(query) { return this._bannerRepo.findAll(query); }
}

export class GetFloatingBannerUseCase {
  constructor({ bannerRepo }) { this._bannerRepo = bannerRepo; }
  async execute(id) { return this._bannerRepo.findById(id); }
}

export class CreateFloatingBannerUseCase {
  constructor({ bannerRepo, eventBus }) { this._bannerRepo = bannerRepo; this._eventBus = eventBus; }
  async execute(data) {
    const banner = new (await import('../domain/index.js')).FloatingBanner({ id: undefined, ...data });
    const created = await this._bannerRepo.create(banner);
    if (this._eventBus) this._eventBus.publish('config.floating-banner.created', { banner: created.toJSON() });
    return created;
  }
}

export class UpdateFloatingBannerUseCase {
  constructor({ bannerRepo, eventBus }) { this._bannerRepo = bannerRepo; this._eventBus = eventBus; }
  async execute(id, data) {
    const updated = await this._bannerRepo.update(id, data);
    if (this._eventBus) this._eventBus.publish('config.floating-banner.updated', { banner: updated.toJSON() });
    return updated;
  }
}

export class DeleteFloatingBannerUseCase {
  constructor({ bannerRepo, eventBus }) { this._bannerRepo = bannerRepo; this._eventBus = eventBus; }
  async execute(id) {
    await this._bannerRepo.delete(id);
    if (this._eventBus) this._eventBus.publish('config.floating-banner.deleted', { id });
  }
}

// ── WhatsApp Config ───────────────────────────────────────
export class GetWhatsAppConfigUseCase {
  constructor({ whatsappRepo }) { this._whatsappRepo = whatsappRepo; }
  async execute() { return this._whatsappRepo.get(); }
}

export class UpdateWhatsAppConfigUseCase {
  constructor({ whatsappRepo, eventBus }) { this._whatsappRepo = whatsappRepo; this._eventBus = eventBus; }
  async execute(data) {
    const { phoneNumber, apiToken, apiEndpoint, welcomeMessage, autoReplyEnabled, businessHours, isActive } = data;
    const config = new (await import('../domain/index.js')).WhatsAppConfig({
      id: undefined, phoneNumber, apiToken, apiEndpoint, welcomeMessage,
      autoReplyEnabled, businessHours, isActive,
    });
    const updated = await this._whatsappRepo.upsert(config);
    if (this._eventBus) this._eventBus.publish('config.whatsapp.updated', { config: updated.toJSON() });
    return updated;
  }
}
