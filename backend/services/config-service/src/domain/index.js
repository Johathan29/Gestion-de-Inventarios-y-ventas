// ============================================================
// Configuration Domain — Entities & Value Objects
// ============================================================

import { Entity, ValueObject, AggregateRoot } from '@erp/shared-kernel';

// ── System Config ─────────────────────────────────────────
export class SystemConfig extends ValueObject {
  constructor({ id, key, value, section, description, createdAt, updatedAt }) {
    super();
    this._id = id;
    this._key = key;
    this._value = value;
    this._section = section || 'general';
    this._description = description || '';
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id() { return this._id; }
  get key() { return this._key; }
  get value() { return this._value; }
  get section() { return this._section; }
  get description() { return this._description; }

  toJSON() {
    return { key: this._key, value: this._value, section: this._section, description: this._description };
  }
}

// ── Ecommerce Settings (Singleton Aggregate) ──────────────
export class EcommerceSettings extends AggregateRoot {
  constructor({ id, storeName, description, logoUrl, faviconUrl, contactEmail, contactPhone,
    phone, address, socialNetworks, seoSettings, shippingSettings, paymentSettings,
    currencyCode, currencySymbol, currencyName, country, countryCode, locale,
    defaultTaxRateId, taxIncluded, whatsappNumber, whatsappMessage,
    bannerDefaultUrl, bannerMobileUrl, isActive, createdAt, updatedAt }) {
    super();
    this._id = id;
    this._storeName = storeName;
    this._description = description;
    this._logoUrl = logoUrl;
    this._faviconUrl = faviconUrl;
    this._contactEmail = contactEmail;
    this._contactPhone = contactPhone;
    this._phone = phone;
    this._address = address;
    this._socialNetworks = socialNetworks;
    this._seoSettings = seoSettings;
    this._shippingSettings = shippingSettings;
    this._paymentSettings = paymentSettings;
    this._currencyCode = currencyCode;
    this._currencySymbol = currencySymbol;
    this._currencyName = currencyName;
    this._country = country;
    this._countryCode = countryCode;
    this._locale = locale;
    this._defaultTaxRateId = defaultTaxRateId;
    this._taxIncluded = taxIncluded;
    this._whatsappNumber = whatsappNumber;
    this._whatsappMessage = whatsappMessage;
    this._bannerDefaultUrl = bannerDefaultUrl;
    this._bannerMobileUrl = bannerMobileUrl;
    this._isActive = isActive != null ? isActive : true;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  update(data) {
    if (data.storeName !== undefined) this._storeName = data.storeName;
    if (data.description !== undefined) this._description = data.description;
    if (data.logoUrl !== undefined) this._logoUrl = data.logoUrl;
    if (data.faviconUrl !== undefined) this._faviconUrl = data.faviconUrl;
    if (data.contactEmail !== undefined) this._contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) this._contactPhone = data.contactPhone;
    if (data.phone !== undefined) this._phone = data.phone;
    if (data.address !== undefined) this._address = data.address;
    if (data.socialNetworks !== undefined) this._socialNetworks = data.socialNetworks;
    if (data.seoSettings !== undefined) this._seoSettings = data.seoSettings;
    if (data.shippingSettings !== undefined) this._shippingSettings = data.shippingSettings;
    if (data.paymentSettings !== undefined) this._paymentSettings = data.paymentSettings;
    if (data.currencyCode !== undefined) this._currencyCode = data.currencyCode;
    if (data.currencySymbol !== undefined) this._currencySymbol = data.currencySymbol;
    if (data.currencyName !== undefined) this._currencyName = data.currencyName;
    if (data.country !== undefined) this._country = data.country;
    if (data.countryCode !== undefined) this._countryCode = data.countryCode;
    if (data.locale !== undefined) this._locale = data.locale;
    if (data.defaultTaxRateId !== undefined) this._defaultTaxRateId = data.defaultTaxRateId;
    if (data.taxIncluded !== undefined) this._taxIncluded = data.taxIncluded;
    if (data.whatsappNumber !== undefined) this._whatsappNumber = data.whatsappNumber;
    if (data.whatsappMessage !== undefined) this._whatsappMessage = data.whatsappMessage;
    if (data.bannerDefaultUrl !== undefined) this._bannerDefaultUrl = data.bannerDefaultUrl;
    if (data.bannerMobileUrl !== undefined) this._bannerMobileUrl = data.bannerMobileUrl;
    if (data.isActive !== undefined) this._isActive = data.isActive;
  }

  toJSON() {
    return {
      storeName: this._storeName, description: this._description,
      logoUrl: this._logoUrl, faviconUrl: this._faviconUrl,
      contactEmail: this._contactEmail, contactPhone: this._contactPhone,
      phone: this._phone, address: this._address,
      socialNetworks: this._socialNetworks, seoSettings: this._seoSettings,
      shippingSettings: this._shippingSettings, paymentSettings: this._paymentSettings,
      currencyCode: this._currencyCode, currencySymbol: this._currencySymbol,
      currencyName: this._currencyName, country: this._country,
      countryCode: this._countryCode, locale: this._locale,
      defaultTaxRateId: this._defaultTaxRateId, taxIncluded: this._taxIncluded,
      whatsappNumber: this._whatsappNumber, whatsappMessage: this._whatsappMessage,
      bannerDefaultUrl: this._bannerDefaultUrl, bannerMobileUrl: this._bannerMobileUrl,
      isActive: this._isActive,
    };
  }
}

// ── Tax Rate ──────────────────────────────────────────────
export class TaxRate extends Entity {
  constructor({ id, name, code, rate, countryCode, isDefault, isActive, description, createdAt, updatedAt }) {
    super(id, 'tax_rate');
    this._name = name;
    this._code = code;
    this._rate = rate;
    this._countryCode = countryCode || '';
    this._isDefault = isDefault || false;
    this._isActive = isActive != null ? isActive : true;
    this._description = description || '';
  }

  activate() { this._isActive = true; }
  deactivate() { this._isActive = false; }
  setDefault() { this._isDefault = true; }

  toJSON() {
    return {
      id: this.id, name: this._name, code: this._code, rate: this._rate,
      countryCode: this._countryCode, isDefault: this._isDefault,
      isActive: this._isActive, description: this._description,
    };
  }
}

// ── Hero Slide ────────────────────────────────────────────
export class HeroSlide extends Entity {
  constructor({ id, badge, titleLine1, titleLine2, titleLine2Style, description,
    button1Text, button1Url, button2Text, button2Url, imageUrl, imageMobileUrl,
    sortOrder, isActive, createdAt, updatedAt }) {
    super(id, 'hero_slide');
    this._badge = badge || '';
    this._titleLine1 = titleLine1 || 'The Luxury';
    this._titleLine2 = titleLine2 || 'Pet Atelier.';
    this._titleLine2Style = titleLine2Style || 'italic';
    this._description = description || '';
    this._button1Text = button1Text || 'Explore Collection';
    this._button1Url = button1Url || '#products';
    this._button2Text = button2Text || 'Our Story';
    this._button2Url = button2Url || '#story';
    this._imageUrl = imageUrl;
    this._imageMobileUrl = imageMobileUrl || '';
    this._sortOrder = sortOrder || 0;
    this._isActive = isActive != null ? isActive : true;
  }

  update(data) {
    if (data.badge !== undefined) this._badge = data.badge;
    if (data.titleLine1 !== undefined) this._titleLine1 = data.titleLine1;
    if (data.titleLine2 !== undefined) this._titleLine2 = data.titleLine2;
    if (data.titleLine2Style !== undefined) this._titleLine2Style = data.titleLine2Style;
    if (data.description !== undefined) this._description = data.description;
    if (data.button1Text !== undefined) this._button1Text = data.button1Text;
    if (data.button1Url !== undefined) this._button1Url = data.button1Url;
    if (data.button2Text !== undefined) this._button2Text = data.button2Text;
    if (data.button2Url !== undefined) this._button2Url = data.button2Url;
    if (data.imageUrl !== undefined) this._imageUrl = data.imageUrl;
    if (data.imageMobileUrl !== undefined) this._imageMobileUrl = data.imageMobileUrl;
    if (data.sortOrder !== undefined) this._sortOrder = data.sortOrder;
    if (data.isActive !== undefined) this._isActive = data.isActive;
  }

  activate() { this._isActive = true; }
  deactivate() { this._isActive = false; }

  toJSON() {
    return {
      id: this.id, badge: this._badge, titleLine1: this._titleLine1,
      titleLine2: this._titleLine2, titleLine2Style: this._titleLine2Style,
      description: this._description, button1Text: this._button1Text,
      button1Url: this._button1Url, button2Text: this._button2Text,
      button2Url: this._button2Url, imageUrl: this._imageUrl,
      imageMobileUrl: this._imageMobileUrl, sortOrder: this._sortOrder,
      isActive: this._isActive,
    };
  }
}

// ── Floating Banner ───────────────────────────────────────
export class FloatingBanner extends Entity {
  constructor({ id, title, subtitle, imageUrl, linkUrl, backgroundColor, textColor,
    position, isSticky, isActive, startDate, endDate, sortOrder, createdAt, updatedAt }) {
    super(id, 'floating_banner');
    this._title = title;
    this._subtitle = subtitle || '';
    this._imageUrl = imageUrl || '';
    this._linkUrl = linkUrl || '';
    this._backgroundColor = backgroundColor || '#1a1a2e';
    this._textColor = textColor || '#ffffff';
    this._position = position || 'bottom';
    this._isSticky = isSticky || false;
    this._isActive = isActive != null ? isActive : true;
    this._startDate = startDate;
    this._endDate = endDate;
    this._sortOrder = sortOrder || 0;
  }

  update(data) {
    if (data.title !== undefined) this._title = data.title;
    if (data.subtitle !== undefined) this._subtitle = data.subtitle;
    if (data.imageUrl !== undefined) this._imageUrl = data.imageUrl;
    if (data.linkUrl !== undefined) this._linkUrl = data.linkUrl;
    if (data.backgroundColor !== undefined) this._backgroundColor = data.backgroundColor;
    if (data.textColor !== undefined) this._textColor = data.textColor;
    if (data.position !== undefined) this._position = data.position;
    if (data.isSticky !== undefined) this._isSticky = data.isSticky;
    if (data.isActive !== undefined) this._isActive = data.isActive;
    if (data.startDate !== undefined) this._startDate = data.startDate;
    if (data.endDate !== undefined) this._endDate = data.endDate;
    if (data.sortOrder !== undefined) this._sortOrder = data.sortOrder;
  }

  activate() { this._isActive = true; }
  deactivate() { this._isActive = false; }

  toJSON() {
    return {
      id: this.id, title: this._title, subtitle: this._subtitle,
      imageUrl: this._imageUrl, linkUrl: this._linkUrl,
      backgroundColor: this._backgroundColor, textColor: this._textColor,
      position: this._position, isSticky: this._isSticky,
      isActive: this._isActive, startDate: this._startDate,
      endDate: this._endDate, sortOrder: this._sortOrder,
    };
  }
}

// ── WhatsApp Config ───────────────────────────────────────
export class WhatsAppConfig extends Entity {
  constructor({ id, phoneNumber, apiToken, apiEndpoint, welcomeMessage,
    autoReplyEnabled, businessHours, isActive, createdAt, updatedAt }) {
    super(id, 'whatsapp_config');
    this._phoneNumber = phoneNumber || '';
    this._apiToken = apiToken || '';
    this._apiEndpoint = apiEndpoint || 'https://api.whatsapp.com/send';
    this._welcomeMessage = welcomeMessage || '¡Hola! ¿En qué podemos ayudarte?';
    this._autoReplyEnabled = autoReplyEnabled != null ? autoReplyEnabled : true;
    this._businessHours = businessHours || {};
    this._isActive = isActive != null ? isActive : true;
  }

  update(data) {
    if (data.phoneNumber !== undefined) this._phoneNumber = data.phoneNumber;
    if (data.apiToken !== undefined) this._apiToken = data.apiToken;
    if (data.apiEndpoint !== undefined) this._apiEndpoint = data.apiEndpoint;
    if (data.welcomeMessage !== undefined) this._welcomeMessage = data.welcomeMessage;
    if (data.autoReplyEnabled !== undefined) this._autoReplyEnabled = data.autoReplyEnabled;
    if (data.businessHours !== undefined) this._businessHours = data.businessHours;
    if (data.isActive !== undefined) this._isActive = data.isActive;
  }

  activate() { this._isActive = true; }
  deactivate() { this._isActive = false; }

  toJSON() {
    return {
      id: this.id, phoneNumber: this._phoneNumber, apiToken: this._apiToken,
      apiEndpoint: this._apiEndpoint, welcomeMessage: this._welcomeMessage,
      autoReplyEnabled: this._autoReplyEnabled, businessHours: this._businessHours,
      isActive: this._isActive,
    };
  }
}
