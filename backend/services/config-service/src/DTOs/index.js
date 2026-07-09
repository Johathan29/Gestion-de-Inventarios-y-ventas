// ============================================================
// Configuration DTOs — Zod Validation Schemas
// ============================================================

import { z } from 'zod';

// ── System Config ─────────────────────────────────────────
export const GetConfigQueryDTO = z.object({
  key: z.string().optional(),
  section: z.string().optional(),
});

export const UpdateConfigDTO = z.object({
  key: z.string().min(1, 'key required'),
  value: z.string().min(1, 'value required'),
  section: z.string().optional().default('general'),
  description: z.string().optional(),
});

export const BulkUpdateConfigDTO = z.object({
  configs: z.array(UpdateConfigDTO).min(1, 'At least one config required'),
});

// ── Ecommerce Settings ────────────────────────────────────
const jsonObject = z.record(z.unknown()).optional();

export const UpdateEcommerceSettingsDTO = z.object({
  storeName: z.string().max(255).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  faviconUrl: z.string().url().optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
  socialNetworks: jsonObject,
  seoSettings: jsonObject,
  shippingSettings: jsonObject,
  paymentSettings: jsonObject,
  currencyCode: z.string().max(5).optional(),
  currencySymbol: z.string().max(10).optional(),
  currencyName: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  countryCode: z.string().max(5).optional(),
  locale: z.string().max(10).optional(),
  defaultTaxRateId: z.string().uuid().optional().nullable(),
  taxIncluded: z.boolean().optional(),
  whatsappNumber: z.string().max(30).optional(),
  whatsappMessage: z.string().optional(),
  bannerDefaultUrl: z.string().optional(),
  bannerMobileUrl: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ── Tax Rates ─────────────────────────────────────────────
export const CreateTaxRateDTO = z.object({
  name: z.string().min(1, 'name required'),
  code: z.string().min(1, 'code required'),
  rate: z.number().positive('rate must be positive'),
  countryCode: z.string().max(5).optional().default(''),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  description: z.string().optional().default(''),
});

export const UpdateTaxRateDTO = CreateTaxRateDTO.partial();

// ── Hero Slides ───────────────────────────────────────────
export const CreateHeroSlideDTO = z.object({
  badge: z.string().max(255).optional().default(''),
  titleLine1: z.string().max(255).optional().default('The Luxury'),
  titleLine2: z.string().max(255).optional().default('Pet Atelier.'),
  titleLine2Style: z.string().max(50).optional().default('italic'),
  description: z.string().optional().default(''),
  button1Text: z.string().max(100).optional().default('Explore Collection'),
  button1Url: z.string().max(500).optional().default('#products'),
  button2Text: z.string().max(100).optional().default('Our Story'),
  button2Url: z.string().max(500).optional().default('#story'),
  imageUrl: z.string().min(1, 'imageUrl required'),
  imageMobileUrl: z.string().optional().default(''),
  sortOrder: z.number().int().nonnegative().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const UpdateHeroSlideDTO = CreateHeroSlideDTO.partial();

export const ReorderHeroSlidesDTO = z.object({
  order: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().nonnegative(),
  })).min(1, 'order array required'),
});

// ── Floating Banners ──────────────────────────────────────
export const CreateFloatingBannerDTO = z.object({
  title: z.string().min(1, 'title required'),
  subtitle: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  linkUrl: z.string().max(500).optional().default(''),
  backgroundColor: z.string().max(50).optional().default('#1a1a2e'),
  textColor: z.string().max(50).optional().default('#ffffff'),
  position: z.enum(['top', 'bottom']).optional().default('bottom'),
  isSticky: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  sortOrder: z.number().int().nonnegative().optional().default(0),
});

export const UpdateFloatingBannerDTO = CreateFloatingBannerDTO.partial();

// ── WhatsApp Config ───────────────────────────────────────
export const UpdateWhatsAppConfigDTO = z.object({
  phoneNumber: z.string().max(30).optional(),
  apiToken: z.string().optional(),
  apiEndpoint: z.string().max(500).optional(),
  welcomeMessage: z.string().optional(),
  autoReplyEnabled: z.boolean().optional(),
  businessHours: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});
