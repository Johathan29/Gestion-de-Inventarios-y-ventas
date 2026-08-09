// ============================================================
// RBAC Permissions — Domain Logic
// ============================================================

/**
 * Permission codes following resource.action pattern.
 * These match the database `permissions` table seed data.
 */
export const Permission = Object.freeze({
  // Companies
  COMPANIES_READ:    'companies.read',
  COMPANIES_UPDATE:  'companies.update',

  // Users
  USERS_CREATE:      'users.create',
  USERS_READ:        'users.read',
  USERS_UPDATE:      'users.update',
  USERS_DELETE:      'users.delete',
  USERS_MANAGE:      'users.manage',

  // Roles
  ROLES_CREATE:      'roles.create',
  ROLES_READ:        'roles.read',
  ROLES_UPDATE:      'roles.update',
  ROLES_DELETE:      'roles.delete',

  // Products
  PRODUCTS_CREATE:   'products.create',
  PRODUCTS_READ:     'products.read',
  PRODUCTS_UPDATE:   'products.update',
  PRODUCTS_DELETE:   'products.delete',
  PRODUCTS_EXPORT:   'products.export',
  PRODUCTS_IMPORT:   'products.import',

  // Categories
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_READ:   'categories.read',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',

  // Inventory
  INVENTORY_CREATE:  'inventory.create',
  INVENTORY_READ:    'inventory.read',
  INVENTORY_UPDATE:  'inventory.update',
  INVENTORY_DELETE:  'inventory.delete',

  // Sales
  SALES_CREATE:      'sales.create',
  SALES_READ:        'sales.read',
  SALES_UPDATE:      'sales.update',
  SALES_DELETE:      'sales.delete',
  SALES_EXPORT:      'sales.export',

  // Purchases
  PURCHASES_CREATE:  'purchases.create',
  PURCHASES_READ:    'purchases.read',
  PURCHASES_UPDATE:  'purchases.update',
  PURCHASES_DELETE:  'purchases.delete',
  PURCHASES_APPROVE: 'purchases.approve',

  // Invoices
  INVOICES_CREATE:   'invoices.create',
  INVOICES_READ:     'invoices.read',
  INVOICES_UPDATE:   'invoices.update',
  INVOICES_CANCEL:   'invoices.cancel',

  // Clients
  CLIENTS_CREATE:    'clients.create',
  CLIENTS_READ:      'clients.read',
  CLIENTS_UPDATE:    'clients.update',
  CLIENTS_DELETE:    'clients.delete',

  // CMS
  CMS_PAGES_CREATE:  'cms.pages.create',
  CMS_PAGES_READ:    'cms.pages.read',
  CMS_PAGES_UPDATE:  'cms.pages.update',
  CMS_PAGES_DELETE:  'cms.pages.delete',
  CMS_PAGES_PUBLISH: 'cms.pages.publish',

  // Forms
  FORMS_CREATE:      'forms.create',
  FORMS_READ:        'forms.read',
  FORMS_UPDATE:      'forms.update',
  FORMS_DELETE:      'forms.delete',

  // Design
  THEMES_READ:       'themes.read',
  THEMES_APPLY:      'themes.apply',
  BRANDING_UPDATE:   'branding.update',

  // Reports
  REPORTS_SALES:     'reports.sales',
  REPORTS_INVENTORY: 'reports.inventory',
  REPORTS_FINANCE:   'reports.finance',
  REPORTS_CRM:       'reports.crm',

  // Settings
  SETTINGS_READ:     'settings.read',
  SETTINGS_UPDATE:   'settings.update',

  // Integrations
  INTEGRATIONS_MANAGE: 'integrations.manage',

  // Webhooks
  WEBHOOKS_MANAGE:   'webhooks.manage',

  // Subscriptions
  SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',
});

/**
 * Get all permission codes for a given resource.
 *
 * @param {string} resource - e.g. 'products', 'sales'
 * @returns {string[]}
 */
export function getPermissionsForResource(resource) {
  return Object.values(Permission).filter(p => p.startsWith(`${resource}.`));
}

/**
 * Check if a permission code is valid.
 *
 * @param {string} code
 * @returns {boolean}
 */
export function isValidPermissionCode(code) {
  return Object.values(Permission).includes(code);
}
