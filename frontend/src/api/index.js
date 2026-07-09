import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import router from '../router';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para añadir token
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
  me: () => api.get('/auth/me')
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
  getClientSales: (params) => api.get('/sales/client', { params })
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
  addItem: (data) => api.post('/cart', data),
  updateItem: (id, data) => api.put(`/cart/${id}`, data),
  removeItem: (id) => api.delete(`/cart/${id}`),
  clearCart: () => api.delete('/cart')
};

export const checkoutAPI = {
  checkout: (data) => api.post('/checkout', data),
  getCheckoutData: () => api.get('/checkout/data')
};

export const ecommerceAPI = {
  getHome: () => api.get('/ecommerce/home'),
  getBanners: () => api.get('/ecommerce/banners'),
  createBanner: (data) => api.post('/ecommerce/banners', data),
  updateBanner: (id, data) => api.put(`/ecommerce/banners/${id}`, data),
  deleteBanner: (id) => api.delete(`/ecommerce/banners/${id}`),
  getOffers: () => api.get('/ecommerce/offers'),
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
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  getByUserId: (userId) => api.get(`/users/by-user/${userId}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  // Cuenta de crédito
  getCreditAccount: () => api.get('/users/credit-account'),
  createCreditAccount: (data) => api.post('/users/credit-account', data),
  updateCreditAccount: (id, data) => api.put(`/users/credit-account/${id}`, data),
  // Preferencias de notificación
  getNotificationPreferences: () => api.get('/users/notification-prefs'),
  updateNotificationPreferences: (data) => api.put('/users/notification-prefs', data)
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
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
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

export default api;
