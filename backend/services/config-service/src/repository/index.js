// ============================================================
// Configuration — Supabase Repositories
// ============================================================

import { tenantStorage } from '@erp/shared-kernel';
import { SystemConfig, EcommerceSettings, TaxRate, HeroSlide, FloatingBanner, WhatsAppConfig } from '../domain/index.js';

// Helper to create a tenant-aware getter for the supabase client
function _defineTenantClient(instance, baseClient) {
  Object.defineProperty(instance, '_supabase', {
    get() { return tenantStorage.getStore()?.supabase || baseClient; },
    configurable: true, enumerable: true,
  });
}

// ── System Config Repository ─────────────────────────────
export class SupabaseSystemConfigRepository {
  constructor(supabase) { _defineTenantClient(this, supabase); }

  async findAll({ key, section } = {}) {
    let query = this._supabase.from('system_config').select('*').order('section').order('key');
    if (key) query = query.eq('key', key);
    if (section) query = query.eq('section', section);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(row => new SystemConfig(this._mapRow(row)));
  }

  async findById(id) {
    const { data, error } = await this._supabase.from('system_config').select('*').eq('id', id).single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return new SystemConfig(this._mapRow(data));
  }

  async findByKey(key, section) {
    const { data, error } = await this._supabase
      .from('system_config').select('*').eq('key', key).eq('section', section || 'general').single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return new SystemConfig(this._mapRow(data));
  }

  async upsert(config) {
    const existing = await this.findByKey(config.key, config.section || 'general');
    if (existing) {
      const { data, error } = await this._supabase
        .from('system_config').update({ value: config.value, description: config.description, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single();
      if (error) throw error;
      return new SystemConfig(this._mapRow(data));
    }
    const { data, error } = await this._supabase
      .from('system_config').insert({ key: config.key, value: config.value, section: config.section || 'general', description: config.description })
      .select().single();
    if (error) throw error;
    return new SystemConfig(this._mapRow(data));
  }

  async bulkUpsert(configs) {
    const results = [];
    for (const c of configs) results.push(await this.upsert(c));
    return results;
  }

  async getSections() {
    const { data, error } = await this._supabase.from('system_config').select('section').order('section');
    if (error) throw error;
    return [...new Set(data.map(r => r.section).filter(Boolean))];
  }

  async deleteByKey(key, section) {
    const { error } = await this._supabase.from('system_config').delete().eq('key', key).eq('section', section || 'general');
    if (error) throw error;
  }

  _mapRow(row) {
    return { id: row.id, key: row.key, value: row.value, section: row.section, description: row.description, createdAt: row.created_at, updatedAt: row.updated_at };
  }
}

// ── Ecommerce Settings Repository (Singleton) ────────────
export class SupabaseEcommerceRepository {
  constructor(supabase) { _defineTenantClient(this, supabase); }
  get FIXED_ID() { return '00000000-0000-0000-0000-000000000001'; }

  async get() {
    const { data, error } = await this._supabase.from('ecommerce_settings').select('*').single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data ? new EcommerceSettings(this._mapRow(data)) : null;
  }

  async upsert(settings) {
    const payload = {
      id: this.FIXED_ID,
      store_name: settings.storeName, description: settings.description,
      logo_url: settings.logoUrl, favicon_url: settings.faviconUrl,
      contact_email: settings.contactEmail, contact_phone: settings.contactPhone,
      phone: settings.phone, address: settings.address,
      social_networks: settings.socialNetworks, seo_settings: settings.seoSettings,
      shipping_settings: settings.shippingSettings, payment_settings: settings.paymentSettings,
      currency_code: settings.currencyCode, currency_symbol: settings.currencySymbol,
      currency_name: settings.currencyName, country: settings.country,
      country_code: settings.countryCode, locale: settings.locale,
      default_tax_rate_id: settings.defaultTaxRateId, tax_included: settings.taxIncluded,
      whatsapp_number: settings.whatsappNumber, whatsapp_message: settings.whatsappMessage,
      banner_default_url: settings.bannerDefaultUrl, banner_mobile_url: settings.bannerMobileUrl,
      is_active: settings.isActive,
    };
    // Clean undefined
    Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });

    const { data, error } = await this._supabase
      .from('ecommerce_settings').upsert(payload).select().single();
    if (error) throw error;
    return new EcommerceSettings(this._mapRow(data));
  }

  _mapRow(row) {
    return {
      id: row.id, storeName: row.store_name, description: row.description,
      logoUrl: row.logo_url, faviconUrl: row.favicon_url,
      contactEmail: row.contact_email, contactPhone: row.contact_phone,
      phone: row.phone, address: row.address,
      socialNetworks: row.social_networks, seoSettings: row.seo_settings,
      shippingSettings: row.shipping_settings, paymentSettings: row.payment_settings,
      currencyCode: row.currency_code, currencySymbol: row.currency_symbol,
      currencyName: row.currency_name, country: row.country,
      countryCode: row.country_code, locale: row.locale,
      defaultTaxRateId: row.default_tax_rate_id, taxIncluded: row.tax_included,
      whatsappNumber: row.whatsapp_number, whatsappMessage: row.whatsapp_message,
      bannerDefaultUrl: row.banner_default_url, bannerMobileUrl: row.banner_mobile_url,
      isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

// ── Tax Rate Repository ──────────────────────────────────
export class SupabaseTaxRateRepository {
  constructor(supabase) { _defineTenantClient(this, supabase); }

  async findAll({ isActive } = {}) {
    let query = this._supabase.from('tax_rates').select('*').order('name');
    if (isActive !== undefined) query = query.eq('is_active', isActive);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(row => this._toDomain(row));
  }

  async findById(id) {
    const { data, error } = await this._supabase.from('tax_rates').select('*').eq('id', id).single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return this._toDomain(data);
  }

  async findByCode(code) {
    const { data, error } = await this._supabase.from('tax_rates').select('*').eq('code', code).single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return this._toDomain(data);
  }

  async create(taxRate) {
    const { data, error } = await this._supabase.from('tax_rates').insert({
      name: taxRate._name, code: taxRate._code, rate: taxRate._rate,
      country_code: taxRate._countryCode, is_default: taxRate._isDefault,
      is_active: taxRate._isActive, description: taxRate._description,
    }).select().single();
    if (error) throw error;
    return this._toDomain(data);
  }

  async update(id, data) {
    const payload = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.code !== undefined) payload.code = data.code;
    if (data.rate !== undefined) payload.rate = data.rate;
    if (data.countryCode !== undefined) payload.country_code = data.countryCode;
    if (data.isDefault !== undefined) payload.is_default = data.isDefault;
    if (data.isActive !== undefined) payload.is_active = data.isActive;
    if (data.description !== undefined) payload.description = data.description;
    payload.updated_at = new Date().toISOString();

    const { data: updated, error } = await this._supabase.from('tax_rates').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return this._toDomain(updated);
  }

  async delete(id) {
    const { error } = await this._supabase.from('tax_rates').delete().eq('id', id);
    if (error) throw error;
  }

  _toDomain(row) {
    return new TaxRate({
      id: row.id, name: row.name, code: row.code, rate: row.rate,
      countryCode: row.country_code, isDefault: row.is_default,
      isActive: row.is_active, description: row.description,
      createdAt: row.created_at, updatedAt: row.updated_at,
    });
  }
}

// ── Hero Slide Repository ────────────────────────────────
export class SupabaseHeroSlideRepository {
  constructor(supabase) { _defineTenantClient(this, supabase); }

  async findAll({ isActive } = {}) {
    let query = this._supabase.from('hero_slides').select('*').order('sort_order');
    if (isActive !== undefined) query = query.eq('is_active', isActive);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(row => this._toDomain(row));
  }

  async findById(id) {
    const { data, error } = await this._supabase.from('hero_slides').select('*').eq('id', id).single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return this._toDomain(data);
  }

  async create(slide) {
    const { data, error } = await this._supabase.from('hero_slides').insert({
      badge: slide._badge, title_line1: slide._titleLine1, title_line2: slide._titleLine2,
      title_line2_style: slide._titleLine2Style, description: slide._description,
      button1_text: slide._button1Text, button1_url: slide._button1Url,
      button2_text: slide._button2Text, button2_url: slide._button2Url,
      image_url: slide._imageUrl, image_mobile_url: slide._imageMobileUrl,
      sort_order: slide._sortOrder, is_active: slide._isActive,
    }).select().single();
    if (error) throw error;
    return this._toDomain(data);
  }

  async update(id, data) {
    const payload = {};
    if (data.badge !== undefined) payload.badge = data.badge;
    if (data.titleLine1 !== undefined) payload.title_line1 = data.titleLine1;
    if (data.titleLine2 !== undefined) payload.title_line2 = data.titleLine2;
    if (data.titleLine2Style !== undefined) payload.title_line2_style = data.titleLine2Style;
    if (data.description !== undefined) payload.description = data.description;
    if (data.button1Text !== undefined) payload.button1_text = data.button1Text;
    if (data.button1Url !== undefined) payload.button1_url = data.button1Url;
    if (data.button2Text !== undefined) payload.button2_text = data.button2Text;
    if (data.button2Url !== undefined) payload.button2_url = data.button2Url;
    if (data.imageUrl !== undefined) payload.image_url = data.imageUrl;
    if (data.imageMobileUrl !== undefined) payload.image_mobile_url = data.imageMobileUrl;
    if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
    if (data.isActive !== undefined) payload.is_active = data.isActive;
    payload.updated_at = new Date().toISOString();

    const { data: updated, error } = await this._supabase.from('hero_slides').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return this._toDomain(updated);
  }

  async reorder(order) {
    for (const item of order) {
      await this._supabase.from('hero_slides').update({ sort_order: item.sortOrder, updated_at: new Date().toISOString() }).eq('id', item.id);
    }
    return this.findAll();
  }

  async delete(id) {
    const { error } = await this._supabase.from('hero_slides').delete().eq('id', id);
    if (error) throw error;
  }

  _toDomain(row) {
    return new HeroSlide({
      id: row.id, badge: row.badge, titleLine1: row.title_line1,
      titleLine2: row.title_line2, titleLine2Style: row.title_line2_style,
      description: row.description, button1Text: row.button1_text,
      button1Url: row.button1_url, button2Text: row.button2_text,
      button2Url: row.button2_url, imageUrl: row.image_url,
      imageMobileUrl: row.image_mobile_url, sortOrder: row.sort_order,
      isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at,
    });
  }
}

// ── Floating Banner Repository ───────────────────────────
export class SupabaseFloatingBannerRepository {
  constructor(supabase) { _defineTenantClient(this, supabase); }

  async findAll({ isActive } = {}) {
    let query = this._supabase.from('floating_banners').select('*').order('sort_order');
    if (isActive !== undefined) query = query.eq('is_active', isActive);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(row => this._toDomain(row));
  }

  async findById(id) {
    const { data, error } = await this._supabase.from('floating_banners').select('*').eq('id', id).single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return this._toDomain(data);
  }

  async create(banner) {
    const { data, error } = await this._supabase.from('floating_banners').insert({
      title: banner._title, subtitle: banner._subtitle, image_url: banner._imageUrl,
      link_url: banner._linkUrl, background_color: banner._backgroundColor,
      text_color: banner._textColor, position: banner._position,
      is_sticky: banner._isSticky, is_active: banner._isActive,
      start_date: banner._startDate, end_date: banner._endDate,
      sort_order: banner._sortOrder,
    }).select().single();
    if (error) throw error;
    return this._toDomain(data);
  }

  async update(id, data) {
    const payload = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.subtitle !== undefined) payload.subtitle = data.subtitle;
    if (data.imageUrl !== undefined) payload.image_url = data.imageUrl;
    if (data.linkUrl !== undefined) payload.link_url = data.linkUrl;
    if (data.backgroundColor !== undefined) payload.background_color = data.backgroundColor;
    if (data.textColor !== undefined) payload.text_color = data.textColor;
    if (data.position !== undefined) payload.position = data.position;
    if (data.isSticky !== undefined) payload.is_sticky = data.isSticky;
    if (data.isActive !== undefined) payload.is_active = data.isActive;
    if (data.startDate !== undefined) payload.start_date = data.startDate;
    if (data.endDate !== undefined) payload.end_date = data.endDate;
    if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
    payload.updated_at = new Date().toISOString();

    const { data: updated, error } = await this._supabase.from('floating_banners').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return this._toDomain(updated);
  }

  async delete(id) {
    const { error } = await this._supabase.from('floating_banners').delete().eq('id', id);
    if (error) throw error;
  }

  _toDomain(row) {
    return new FloatingBanner({
      id: row.id, title: row.title, subtitle: row.subtitle,
      imageUrl: row.image_url, linkUrl: row.link_url,
      backgroundColor: row.background_color, textColor: row.text_color,
      position: row.position, isSticky: row.is_sticky,
      isActive: row.is_active, startDate: row.start_date,
      endDate: row.end_date, sortOrder: row.sort_order,
      createdAt: row.created_at, updatedAt: row.updated_at,
    });
  }
}

// ── WhatsApp Config Repository ───────────────────────────
export class SupabaseWhatsAppConfigRepository {
  constructor(supabase) { _defineTenantClient(this, supabase); }

  async get() {
    const { data, error } = await this._supabase.from('whatsapp_config').select('*').limit(1).single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data ? this._toDomain(data) : null;
  }

  async upsert(config) {
    const existing = await this.get();
    const payload = {
      phone_number: config._phoneNumber, api_token: config._apiToken,
      api_endpoint: config._apiEndpoint, welcome_message: config._welcomeMessage,
      auto_reply_enabled: config._autoReplyEnabled,
      business_hours: config._businessHours, is_active: config._isActive,
    };
    Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });

    if (existing) {
      const { data, error } = await this._supabase.from('whatsapp_config').update(payload).eq('id', existing.id).select().single();
      if (error) throw error;
      return this._toDomain(data);
    }
    const { data, error } = await this._supabase.from('whatsapp_config').insert(payload).select().single();
    if (error) throw error;
    return this._toDomain(data);
  }

  _toDomain(row) {
    return new WhatsAppConfig({
      id: row.id, phoneNumber: row.phone_number, apiToken: row.api_token,
      apiEndpoint: row.api_endpoint, welcomeMessage: row.welcome_message,
      autoReplyEnabled: row.auto_reply_enabled, businessHours: row.business_hours,
      isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at,
    });
  }
}
