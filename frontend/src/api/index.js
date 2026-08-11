import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import router from '../router';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para añadir token y company_id
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Multi-tenant: attach company_id from auth store
  try {
    const authStore = useAuthStore();
    if (authStore.companyId) {
      config.headers['x-company-id'] = authStore.companyId;
    }
  } catch (_) { /* auth store not yet initialized */ }
  return config;
});

// Interceptor para manejar errores 401 y refresh token
// También unwrap automático de la envoltura { success, data }
api.interceptors.response.use(
  (response) => {
    // Si la respuesta sigue el patrón { success: true, data: ... }, unwrap automático
    if (response.data && typeof response.data === 'object' && response.data.success === true && 'data' in response.data) {
      const pagination = response.data.pagination;
      const message = response.data.message;
      response.data = response.data.data;
      if (pagination) {
        response.pagination = pagination;
      }
      if (message) {
        response.message = message;
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Visitante sin sesión: no redirigir a /login (páginas públicas como
      // landing/catálogo no deben expulsar al usuario anónimo).
      if (!sessionStorage.getItem('refreshToken')) {
        return Promise.reject(error);
      }

      try {
        const refreshToken = sessionStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken
        });

        sessionStorage.setItem('accessToken', data.data.accessToken);
        sessionStorage.setItem('refreshToken', data.data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        const authStore = useAuthStore();
        authStore.clearAuth();
        router.push('/login');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API modules
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  refresh: (data) => api.post('/auth/refresh', data),
  logout: (data) => api.post('/auth/logout', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  me: () => api.get('/auth/me'),
  verifyPassword: (data) => api.post('/auth/verify-password', data)
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateProfile: (data) => api.put('/users/me/perfil', data),
  delete: (id) => api.delete(`/users/${id}`),
  changeRole: (id, data) => api.put(`/users/${id}/role`, data),
  toggleActive: (id) => api.put(`/users/${id}/toggle-active`),
  getAccessHistory: (id) => api.get(`/users/${id}/access-history`)
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getByCategory: (id) => api.get(`/products/category/${id}`),
  getLowStock: () => api.get('/products/low-stock'),
  toggleFeatured: (id) => api.put(`/products/${id}/featured`),
  getVariants: (id) => api.get(`/products/${id}/variants`),
  createVariant: (id, data) => api.post(`/products/${id}/variants`, data),
  updateVariant: (pid, vid, data) => api.put(`/products/${pid}/variants/${vid}`, data),
  deleteVariant: (pid, vid) => api.delete(`/products/${pid}/variants/${vid}`),
  // Imágenes - Subir archivo (multipart)
  uploadImage: (id, file, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/products/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    });
  },
  // Imágenes - Subir por URL
  uploadImageByUrl: (id, image_url) => api.post(`/products/${id}/images/url`, { image_url }),
  // Imágenes - Eliminar
  deleteImage: (id, image_url) => api.delete(`/products/${id}/images`, { data: { image_url } })
};

export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  getTree: () => api.get('/categories/tree')
};

export const inventoryAPI = {
  getAll: (params) => api.get('/inventory/stock', { params }),
  getByProduct: (id) => api.get(`/inventory/stock/${id}`),
  getMovements: (params) => api.get('/inventory/movements', { params }),
  createEntry: (data) => api.post('/inventory/entries', data),
  createExit: (data) => api.post('/inventory/exits', data),
  createAdjustment: (data) => api.post('/inventory/adjustments', data),
  createTransfer: (data) => api.post('/inventory/transfers', data),
  getAlerts: () => api.get('/inventory/alerts'),
  getSummary: () => api.get('/inventory/summary')
};

export const purchasesAPI = {
  getAll: (params) => api.get('/purchases', { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  getNextNumber: () => api.get('/purchases/next-number'),
  updateStatus: (id, data) => api.put(`/purchases/${id}/status`, data),
  cancel: (id) => api.put(`/purchases/${id}/cancel`),
  sendToInventory: (id) => api.post(`/purchases/${id}/send-to-inventory`),
  verify: (id, data) => api.post(`/purchases/${id}/verify`, data),
  updateItem: (id, itemId, data) => api.put(`/purchases/${id}/items/${itemId}`, data),
  deleteItem: (id, itemId) => api.delete(`/purchases/${id}/items/${itemId}`)
};

export const suppliersAPI = {
  getAll: (params) => api.get('/purchases/suppliers', { params }),
  getById: (id) => api.get(`/purchases/suppliers/${id}`),
  create: (data) => api.post('/purchases/suppliers', data),
  update: (id, data) => api.put(`/purchases/suppliers/${id}`, data),
  delete: (id) => api.delete(`/purchases/suppliers/${id}`)
};

export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  cancel: (id) => api.put(`/sales/${id}/cancel`),
  getClientSales: (params) => api.get('/sales/my-sales', { params })
};

export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  getPdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  cancel: (id) => api.put(`/invoices/${id}/cancel`),
  sendEmail: (id) => api.post(`/invoices/${id}/email`),
  updatePaymentStatus: (id, status) => api.patch(`/invoices/${id}/payment-status`, { status })
};

export const cartAPI = {
  getCart: () => api.get('/cart'),
  addItem: (data) => api.post('/cart/items', data),
  updateItem: (id, data) => api.put(`/cart/items/${id}`, data),
  removeItem: (id) => api.delete(`/cart/items/${id}`),
  clearCart: () => api.delete('/cart')
};

export const checkoutAPI = {
  checkout: (data) => api.post('/checkout', data),
  getCheckoutData: () => api.get('/checkout/data')
};

export const ecommerceAPI = {
  getHome: () => api.get('/ecommerce/home'),
  // Catálogo público (solo productos activos, sin autenticación)
  getProducts: (params) => api.get('/ecommerce/products', { params }),
  getCategories: () => api.get('/ecommerce/categories'),
  getBanners: () => api.get('/ecommerce/banners'),
  createBanner: (data) => api.post('/ecommerce/banners', data),
  updateBanner: (id, data) => api.put(`/ecommerce/banners/${id}`, data),
  deleteBanner: (id) => api.delete(`/ecommerce/banners/${id}`),
  getOffers: (params) => api.get('/ecommerce/offers', { params }),
  createOffer: (data) => api.post('/ecommerce/offers', data),
  updateOffer: (id, data) => api.put(`/ecommerce/offers/${id}`, data),
  deleteOffer: (id) => api.delete(`/ecommerce/offers/${id}`),
  getSettings: () => api.get('/ecommerce/settings'),
  updateSettings: (data) => api.put('/ecommerce/settings', data),
  // Hero (legacy single)
  getHero: () => api.get('/ecommerce/hero'),
  updateHero: (data) => api.put('/ecommerce/hero', data),
  // Hero Carousel Slides
  getHeroSlides: () => api.get('/ecommerce/hero-slides'),
  getAllHeroSlides: () => api.get('/ecommerce/hero-slides/all'),
  createHeroSlide: (data) => api.post('/ecommerce/hero-slides', data),
  updateHeroSlide: (id, data) => api.put(`/ecommerce/hero-slides/${id}`, data),
  deleteHeroSlide: (id) => api.delete(`/ecommerce/hero-slides/${id}`),
  // Floating Banners
  getFloatingBanners: () => api.get('/ecommerce/floating-banners'),
  getAllFloatingBanners: () => api.get('/ecommerce/floating-banners/all'),
  createFloatingBanner: (data) => api.post('/ecommerce/floating-banners', data),
  updateFloatingBanner: (id, data) => api.put(`/ecommerce/floating-banners/${id}`, data),
  deleteFloatingBanner: (id) => api.delete(`/ecommerce/floating-banners/${id}`),
  // Tax Rates
  getTaxRates: (params) => api.get('/ecommerce/tax-rates', { params }),
  getAllTaxRates: () => api.get('/ecommerce/tax-rates/all'),
  createTaxRate: (data) => api.post('/ecommerce/tax-rates', data),
  updateTaxRate: (id, data) => api.put(`/ecommerce/tax-rates/${id}`, data),
  deleteTaxRate: (id) => api.delete(`/ecommerce/tax-rates/${id}`),
  // WhatsApp Config
  getWhatsappConfig: () => api.get('/ecommerce/whatsapp-config'),
  updateWhatsappConfig: (data) => api.put('/ecommerce/whatsapp-config', data),
  // Contact Messages
  createContactMessage: (data) => api.post('/ecommerce/contact', data),
  // Reviews
  getFeaturedReviews: () => api.get('/ecommerce/reviews/featured'),
  getProductReviews: (productId, params) => api.get(`/ecommerce/reviews/product/${productId}`, { params }),
  createReview: (data) => api.post('/ecommerce/reviews', data),
  getAllReviews: (params) => api.get('/ecommerce/reviews', { params }),
  moderateReview: (id, data) => api.put(`/ecommerce/reviews/${id}/moderate`, data),
  deleteReview: (id) => api.delete(`/ecommerce/reviews/${id}`)
};

export const catalogAPI = {
  search: (params) => api.get('/catalog/search', { params }),
  getProduct: (id) => api.get(`/catalog/products/${id}`)
};

export const clientsAPI = {
  getAll: (params) => api.get('/clients', { params }),
  getById: (id) => api.get(`/clients/${id}`),
  getByUserId: (userId) => api.get(`/clients/by-user/${userId}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  // Cuenta de crédito
  getCreditAccount: () => api.get('/clients/credit-account'),
  createCreditAccount: (data) => api.post('/clients/credit-account', data),
  updateCreditAccount: (id, data) => api.put(`/clients/credit-account/${id}`, data),
  // Preferencias de notificación
  getNotificationPreferences: () => api.get('/clients/notification-prefs'),
  updateNotificationPreferences: (data) => api.put('/clients/notification-prefs', data),
  sendPasswordReset: (email) => api.post('/auth/forgot-password', { email })
};

export const reportsAPI = {
  dashboard: () => api.get('/reports/dashboard'),
  sales: (params) => api.get('/reports/sales', { params }),
  salesChart: () => api.get('/reports/sales-chart'),
  inventory: (params) => api.get('/reports/inventory', { params }),
  topProducts: (params) => api.get('/reports/top-products', { params }),
  clients: (params) => api.get('/reports/clients', { params })
};

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getById: (id) => api.get(`/notifications/${id}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
  getById: (id) => api.get(`/audit/${id}`),
  getRecent: () => api.get('/audit/recent'),
  getStats: () => api.get('/audit/stats')
};

export const configAPI = {
  getAll: (params) => api.get('/config', { params }),
  getSections: () => api.get('/config/sections'),
  update: (data) => api.put('/config', data),
  bulkUpdate: (data) => api.post('/config/bulk', data)
};

export const emailAPI = {
  send: (data) => api.post('/email/send', data),
  sendInvoice: (id) => api.post(`/email/invoice/${id}`),
  sendPurchaseConfirmation: (data) => api.post('/email/purchase-confirmation', data)
};

export const whatsappAPI = {
  send: (data) => api.post('/whatsapp/send', data),
  sendOrderNotification: (data) => api.post('/whatsapp/order-notification', data)
};

// ================================================================
// Wishlist API
// ================================================================
export const wishlistAPI = {
  getAll: (params) => api.get('/wishlist', { params }),
  addItem: (data) => api.post('/wishlist', data),
  removeItem: (productId) => api.delete(`/wishlist/${productId}`),
  checkItem: (productId) => api.get(`/wishlist/${productId}`)
};

// ================================================================
// Coupons & Promotions API
// ================================================================
export const couponsAPI = {
  getAll: (params) => api.get('/coupons', { params }),
  getById: (id) => api.get(`/coupons/${id}`),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`),
  validate: (code) => api.post('/coupons/validate', { code }),
  getUsage: (id) => api.get(`/coupons/${id}/usage`)
};

export const promotionsAPI = {
  getAll: (params) => api.get('/promotions', { params }),
  getById: (id) => api.get(`/promotions/${id}`),
  create: (data) => api.post('/promotions', data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  delete: (id) => api.delete(`/promotions/${id}`),
  getActive: () => api.get('/promotions/active')
};

// ================================================================
// Cash Register API
// ================================================================
export const cashRegisterAPI = {
  getSessions: (params) => api.get('/cash-register/sessions', { params }),
  openSession: (data) => api.post('/cash-register/sessions/open', data),
  closeSession: (id, data) => api.post(`/cash-register/sessions/${id}/close`, data),
  getMovements: (sessionId, params) => api.get(`/cash-register/sessions/${sessionId}/movements`, { params }),
  registerMovement: (data) => api.post('/cash-register/movements', data),
  getCurrentSession: () => api.get('/cash-register/current'),
  getSummary: (params) => api.get('/cash-register/summary', { params }),
  verifyAdmin: (data) => api.post('/cash-register/verify-admin', data)
};

// ================================================================
// Credit Notes API
// ================================================================
export const creditNotesAPI = {
  getAll: (params) => api.get('/credit-notes', { params }),
  getById: (id) => api.get(`/credit-notes/${id}`),
  create: (data) => api.post('/credit-notes', data),
  cancel: (id) => api.put(`/credit-notes/${id}/cancel`)
};

// ================================================================
// Sale Payments API
// ================================================================
export const salePaymentsAPI = {
  getBySale: (saleId) => api.get(`/sales/${saleId}/payments`),
  register: (saleId, data) => api.post(`/sales/${saleId}/payments`, data),
  delete: (saleId, paymentId) => api.delete(`/sales/${saleId}/payments/${paymentId}`)
};

// ================================================================
// System Configurations API
// ================================================================
export const systemConfigAPI = {
  getAll: (params) => api.get('/config/system', { params }),
  getSection: (section) => api.get(`/config/system/${section}`),
  update: (section, data) => api.put(`/config/system/${section}`, data),
  resetToDefaults: (section) => api.post(`/config/system/${section}/reset`)
};

// ================================================================
// Platform Admin API — Global SaaS management
// ================================================================
export const platformAdminAPI = {
  // Global stats
  getStats: () => api.get('/platform-admin/stats'),

  // Companies
  getCompanies: (params) => api.get('/platform-admin/companies', { params }),
  getCompanyDetail: (id) => api.get(`/platform-admin/companies/${id}`),
  createCompany: (data) => api.post('/platform-admin/companies', data),
  updateCompany: (id, data) => api.put(`/platform-admin/companies/${id}`, data),
  toggleCompanyActive: (id, is_active) => api.put(`/platform-admin/companies/${id}/toggle-active`, { is_active }),

  // Impersonation
  startImpersonation: (data) => api.post('/platform-admin/impersonate', data),
  endImpersonation: (sessionId) => api.post(`/platform-admin/impersonate/${sessionId}/end`),

  // Impersonation logs
  getImpersonationLogs: (params) => api.get('/platform-admin/impersonation-logs', { params }),

  // Support sessions
  getActiveSessions: () => api.get('/platform-admin/sessions'),

  // Global users
  getUsers: (params) => api.get('/platform-admin/users', { params }),
  toggleUserActive: (id) => api.put(`/platform-admin/users/${id}/toggle-active`),

  // Dashboard config per company
  getCompanyWidgets: (companyId) => api.get(`/platform-admin/companies/${companyId}/widgets`),
  addCompanyWidget: (companyId, data) => api.post(`/platform-admin/companies/${companyId}/widgets`, data),
  updateCompanyWidget: (companyId, widgetId, data) => api.put(`/platform-admin/companies/${companyId}/widgets/${widgetId}`, data),
  removeCompanyWidget: (companyId, widgetId) => api.delete(`/platform-admin/companies/${companyId}/widgets/${widgetId}`),
  updateDashboardConfig: (companyId, config) => api.put(`/platform-admin/companies/${companyId}/dashboard-config`, { config }),

  // Widget catalog
  getWidgets: () => api.get('/platform-admin/widgets'),

  // Business types & Plans
  getBusinessTypes: () => api.get('/platform-admin/business-types'),
  getPlans: () => api.get('/platform-admin/plans'),

  // Subscription per company
  getCompanySubscription: (companyId) => api.get(`/platform-admin/companies/${companyId}/subscription`),

  // Activity log
  getActivityLog: (companyId, params) => api.get(`/platform-admin/companies/${companyId}/activity`, { params }),
};

// ================================================================
// CRM Pipeline API — Leads & Pipeline management
// ================================================================
export const crmAPI = {
  // Pipelines
  getPipelines: () => api.get('/clients/pipelines'),
  getPipeline: (id) => api.get(`/clients/pipelines/${id}`),
  createPipeline: (data) => api.post('/clients/pipelines', data),
  updatePipeline: (id, data) => api.put(`/clients/pipelines/${id}`, data),
  deletePipeline: (id) => api.delete(`/clients/pipelines/${id}`),

  // Pipeline Stages
  getPipelineStages: (pipelineId) => api.get(`/clients/pipelines/${pipelineId}/stages`),
  createStage: (pipelineId, data) => api.post(`/clients/pipelines/${pipelineId}/stages`, data),
  updateStage: (pipelineId, stageId, data) => api.put(`/clients/pipelines/${pipelineId}/stages/${stageId}`, data),
  deleteStage: (pipelineId, stageId) => api.delete(`/clients/pipelines/${pipelineId}/stages/${stageId}`),

  // Leads
  getLeads: (params) => api.get('/clients/leads', { params }),
  getLead: (id) => api.get(`/clients/leads/${id}`),
  createLead: (data) => api.post('/clients/leads', data),
  updateLead: (id, data) => api.put(`/clients/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/clients/leads/${id}`),
  moveLead: (id, data) => api.put(`/clients/leads/${id}/move`, data),
  convertLead: (id) => api.post(`/clients/leads/${id}/convert`),

  // Lead Activities
  getLeadActivities: (leadId) => api.get(`/clients/leads/${leadId}/activities`),
  addLeadActivity: (leadId, data) => api.post(`/clients/leads/${leadId}/activities`, data),

  // Lead Notes
  getLeadNotes: (leadId) => api.get(`/clients/leads/${leadId}/notes`),
  addLeadNote: (leadId, data) => api.post(`/clients/leads/${leadId}/notes`, data),

  // Lead Sources
  getLeadSources: () => api.get('/clients/lead-sources'),

  // Tasks
  getTasks: (params) => api.get('/clients/tasks', { params }),
  createTask: (data) => api.post('/clients/tasks', data),
  updateTask: (id, data) => api.put(`/clients/tasks/${id}`, data),
  completeTask: (id) => api.put(`/clients/tasks/${id}/complete`),
};

// ================================================================
// CMS & Page Builder API
// ================================================================
export const cmsAPI = {
  // Pages
  getPages: (params) => api.get('/cms/pages', { params }),
  getPage: (id) => api.get(`/cms/pages/${id}`),
  createPage: (data) => api.post('/cms/pages', data),
  updatePage: (id, data) => api.put(`/cms/pages/${id}`, data),
  deletePage: (id) => api.delete(`/cms/pages/${id}`),
  duplicatePage: (id) => api.post(`/cms/pages/${id}/duplicate`),
  publishPage: (id) => api.post(`/cms/pages/${id}/publish`),
  unpublishPage: (id) => api.post(`/cms/pages/${id}/unpublish`),
  getPageVersions: (id) => api.get(`/cms/pages/${id}/versions`),
  restorePageVersion: (id, versionId) => api.post(`/cms/pages/${id}/versions/${versionId}/restore`),

  // Page sections
  getSections: (pageId) => api.get(`/cms/pages/${pageId}/sections`),
  createSection: (pageId, data) => api.post(`/cms/pages/${pageId}/sections`, data),
  updateSection: (pageId, sectionId, data) => api.put(`/cms/pages/${pageId}/sections/${sectionId}`, data),
  deleteSection: (pageId, sectionId) => api.delete(`/cms/pages/${pageId}/sections/${sectionId}`),
  reorderSections: (pageId, data) => api.put(`/cms/pages/${pageId}/sections/reorder`, data),

  // Components
  getComponents: () => api.get('/cms/components'),
  createComponent: (data) => api.post('/cms/components', data),
  updateComponent: (id, data) => api.put(`/cms/components/${id}`, data),

  // Templates
  getTemplates: () => api.get('/cms/templates'),
  createTemplate: (data) => api.post('/cms/templates', data),
  updateTemplate: (id, data) => api.put(`/cms/templates/${id}`, data),

  // Public preview
  getPreview: (slug) => api.get(`/cms/preview/${slug}`),
  getPublicPages: () => api.get('/cms/public/pages'),
};

// ================================================================
// Form Builder API
// ================================================================
export const formBuilderAPI = {
  // Forms
  getForms: (params) => api.get('/forms', { params }),
  getForm: (id) => api.get(`/forms/${id}`),
  createForm: (data) => api.post('/forms', data),
  updateForm: (id, data) => api.put(`/forms/${id}`, data),
  deleteForm: (id) => api.delete(`/forms/${id}`),
  duplicateForm: (id) => api.post(`/forms/${id}/duplicate`),
  publishForm: (id) => api.post(`/forms/${id}/publish`),
  unpublishForm: (id) => api.post(`/forms/${id}/unpublish`),
  getFormStats: (id) => api.get(`/forms/${id}/stats`),

  // Fields
  getFormFields: (formId) => api.get(`/forms/${formId}/fields`),
  createField: (formId, data) => api.post(`/forms/${formId}/fields`, data),
  updateField: (formId, fieldId, data) => api.put(`/forms/${formId}/fields/${fieldId}`, data),
  deleteField: (formId, fieldId) => api.delete(`/forms/${formId}/fields/${fieldId}`),

  // Submissions
  getSubmissions: (formId, params) => api.get(`/forms/${formId}/submissions`, { params }),
  getSubmission: (formId, subId) => api.get(`/forms/${formId}/submissions/${subId}`),
  deleteSubmission: (formId, subId) => api.delete(`/forms/${formId}/submissions/${subId}`),
  exportSubmissions: (formId, params) => api.get(`/forms/${formId}/submissions/export`, { params, responseType: 'blob' }),

  // Public submission (no auth required)
  submitForm: (formId, data) => api.post(`/forms/public/${formId}/submit`, data),

  // Workflows
  getWorkflows: () => api.get('/forms/workflows'),
  createWorkflow: (data) => api.post('/forms/workflows', data),
  updateWorkflow: (id, data) => api.put(`/forms/workflows/${id}`, data),
  deleteWorkflow: (id) => api.delete(`/forms/workflows/${id}`),
  executeWorkflow: (id, data) => api.post(`/forms/workflows/${id}/execute`, data),
};

// ================================================================
// Site Builder API — Media, Themes, Branding, Navigation, Custom Code
// ================================================================
export const siteBuilderAPI = {
  // Media
  getMedia: (params) => api.get('/site/media', { params }),
  getMediaItem: (id) => api.get(`/site/media/${id}`),
  uploadMedia: (data) => api.post('/site/media', data),
  updateMedia: (id, data) => api.put(`/site/media/${id}`, data),
  deleteMedia: (id) => api.delete(`/site/media/${id}`),
  getMediaFolders: () => api.get('/site/media/folders'),

  // Themes
  getThemes: () => api.get('/site/themes'),
  getTheme: (id) => api.get(`/site/themes/${id}`),
  createTheme: (data) => api.post('/site/themes', data),
  updateTheme: (id, data) => api.put(`/site/themes/${id}`, data),
  getCompanyTheme: () => api.get('/site/company-theme'),
  updateCompanyTheme: (data) => api.put('/site/company-theme', data),

  // Brand
  getBrand: () => api.get('/site/brand'),
  updateBrand: (data) => api.put('/site/brand', data),

  // Navigation menus
  getMenus: () => api.get('/site/menus'),
  getMenu: (id) => api.get(`/site/menus/${id}`),
  createMenu: (data) => api.post('/site/menus', data),
  updateMenu: (id, data) => api.put(`/site/menus/${id}`, data),
  deleteMenu: (id) => api.delete(`/site/menus/${id}`),
  getMenuItems: (menuId) => api.get(`/site/menus/${menuId}/items`),
  createMenuItem: (menuId, data) => api.post(`/site/menus/${menuId}/items`, data),
  updateMenuItem: (itemId, data) => api.put(`/site/menus/items/${itemId}`, data),
  deleteMenuItem: (itemId) => api.delete(`/site/menus/items/${itemId}`),
  reorderMenuItems: (menuId, data) => api.put(`/site/menus/${menuId}/reorder`, data),
  // Público (storefront / landing): menús activos por company
  getPublicMenus: (companyId) => api.get('/site/public/menus', { params: { company_id: companyId } }),

  // Header & Footer
  getHeader: () => api.get('/site/header'),
  updateHeader: (data) => api.put('/site/header', data),
  getFooter: () => api.get('/site/footer'),
  updateFooter: (data) => api.put('/site/footer', data),

  // Custom code
  getCustomCode: () => api.get('/site/custom-code'),
  createCustomCode: (data) => api.post('/site/custom-code', data),
  updateCustomCode: (id, data) => api.put(`/site/custom-code/${id}`, data),
  deleteCustomCode: (id) => api.delete(`/site/custom-code/${id}`),

  // Redirects
  getRedirects: () => api.get('/site/redirects'),
  createRedirect: (data) => api.post('/site/redirects', data),
  updateRedirect: (id, data) => api.put(`/site/redirects/${id}`, data),
  deleteRedirect: (id) => api.delete(`/site/redirects/${id}`),

  // Storefront config (public)
  getStorefrontConfig: (slug) => api.get(`/site/storefront/${slug}`),
};

// ================================================================
// Integrations API — Webhooks & Automations
// ================================================================
export const integrationsAPI = {
  // Event types
  getEventTypes: () => api.get('/integrations/event-types'),

  // Webhooks
  getWebhooks: () => api.get('/integrations/webhooks'),
  getWebhook: (id) => api.get(`/integrations/webhooks/${id}`),
  createWebhook: (data) => api.post('/integrations/webhooks', data),
  updateWebhook: (id, data) => api.put(`/integrations/webhooks/${id}`, data),
  deleteWebhook: (id) => api.delete(`/integrations/webhooks/${id}`),
  testWebhook: (id) => api.post(`/integrations/webhooks/${id}/test`),
  getWebhookLogs: (id, params) => api.get(`/integrations/webhooks/${id}/logs`, { params }),

  // Automations
  getAutomations: () => api.get('/integrations/automations'),
  getAutomation: (id) => api.get(`/integrations/automations/${id}`),
  createAutomation: (data) => api.post('/integrations/automations', data),
  updateAutomation: (id, data) => api.put(`/integrations/automations/${id}`, data),
  deleteAutomation: (id) => api.delete(`/integrations/automations/${id}`),
  toggleAutomation: (id) => api.post(`/integrations/automations/${id}/toggle`),
  testAutomation: (id, data) => api.post(`/integrations/automations/${id}/test`, data),
  getAutomationLogs: (id, params) => api.get(`/integrations/automations/${id}/logs`, { params }),
};

// ================================================================
// RBAC & Feature Flags API (extends platformAdminAPI)
// ================================================================
export const rbacAPI = {
  // Roles
  getCompanyRoles: (companyId) => api.get(`/platform-admin/companies/${companyId}/roles`),
  createRole: (companyId, data) => api.post(`/platform-admin/companies/${companyId}/roles`, data),
  updateRole: (companyId, roleId, data) => api.put(`/platform-admin/companies/${companyId}/roles/${roleId}`, data),
  deleteRole: (companyId, roleId) => api.delete(`/platform-admin/companies/${companyId}/roles/${roleId}`),

  // Permissions
  getPermissions: (params) => api.get('/platform-admin/permissions', { params }),

  // Feature flags
  getFeatureFlags: () => api.get('/platform-admin/feature-flags'),
  createFeatureFlag: (data) => api.post('/platform-admin/feature-flags', data),
  updateFeatureFlag: (id, data) => api.put(`/platform-admin/feature-flags/${id}`, data),
  toggleFeatureFlag: (id) => api.put(`/platform-admin/feature-flags/${id}/toggle`),

  // Company features
  getCompanyFeatures: (companyId) => api.get(`/platform-admin/companies/${companyId}/features`),
  setCompanyFeature: (companyId, data) => api.post(`/platform-admin/companies/${companyId}/features`, data),

  // Subscriptions
  createPlan: (data) => api.post('/platform-admin/plans', data),
  updatePlan: (id, data) => api.put(`/platform-admin/plans/${id}`, data),
  assignSubscription: (companyId, data) => api.post(`/platform-admin/companies/${companyId}/subscription`, data),

  // Usage & Audit
  getCompanyUsage: (companyId) => api.get(`/platform-admin/companies/${companyId}/usage`),
  getCompanyAuditLogs: (companyId, params) => api.get(`/platform-admin/companies/${companyId}/audit-logs`, { params }),
};

export default api;
