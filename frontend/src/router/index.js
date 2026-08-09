import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  // Landing / Home (public)
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/LandingView.vue'),
    meta: { layout: 'blank', title: 'Animal Store' }
  },

  // Product Catalog (public)
  {
    path: '/products',
    name: 'ProductsCatalog',
    component: () => import('../views/products/ProductsCatalogView.vue'),
    meta: { layout: 'blank', title: 'Catálogo de Productos' }
  },
  {
    path: '/offers',
    name: 'OffersProducts',
    component: () => import('../views/products/OffersProductsView.vue'),
    meta: { layout: 'blank', title: 'Ofertas Especiales' }
  },
  {
    path: '/products/:id',
    name: 'ProductPublicDetail',
    component: () => import('../views/products/ProductPublicDetailView.vue'),
    meta: { layout: 'blank', title: 'Detalle del Producto' }
  },

  // CMS Pages (public — render pages created in the Page Manager)
  {
    path: '/p/:slug',
    name: 'CmsPublicPage',
    component: () => import('../views/cms/CmsPublicPageView.vue'),
    meta: { layout: 'blank', title: 'Página' }
  },

  // Auth
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: { layout: 'blank', title: 'Iniciar Sesión' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/auth/RegisterView.vue'),
    meta: { layout: 'blank', title: 'Registrarse' }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/auth/ForgotPasswordView.vue'),
    meta: { layout: 'blank', title: 'Recuperar Contraseña' }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/auth/ResetPasswordView.vue'),
    meta: { layout: 'blank', title: 'Restablecer Contraseña' }
  },

  // Cart (público, visible para todos)
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('../views/account/CartView.vue'),
    meta: { layout: 'blank', title: 'Carrito de Compras' }
  },

  // Account / Cliente (requiere autenticación como cliente)
  {
    path: '/account',
    component: () => import('../views/account/AccountLayout.vue'),
    meta: { requiresAuth: true, clientOnly: true },
    children: [
      {
        path: '',
        redirect: { name: 'AccountProfile' }
      },
      {
        path: 'profile',
        name: 'AccountProfile',
        component: () => import('../views/account/ProfileView.vue'),
        meta: { title: 'Mi Perfil' }
      },
      {
        path: 'purchases',
        name: 'AccountPurchases',
        component: () => import('../views/account/PurchasesView.vue'),
        meta: { title: 'Mis Compras' }
      },
      {
        path: 'credit',
        name: 'AccountCredit',
        component: () => import('../views/account/CreditView.vue'),
        meta: { title: 'Cuenta de Crédito' }
      },
      {
        path: 'notifications',
        name: 'AccountNotifications',
        component: () => import('../views/account/NotificationsView.vue'),
        meta: { title: 'Notificaciones' }
      },
      {
        path: 'wishlist',
        name: 'AccountWishlist',
        component: () => import('../views/account/WishlistView.vue'),
        meta: { title: 'Lista de Deseos' }
      },
      {
        path: 'cards',
        name: 'AccountCards',
        component: () => import('../views/account/CardsView.vue'),
        meta: { title: 'Mis Tarjetas' }
      },
      {
        path: 'checkout',
        name: 'AccountCheckout',
        component: () => import('../views/account/CheckoutView.vue'),
        meta: { title: 'Finalizar Compra' }
      }
    ]
  },
  {
    path: '/app',
    component: () => import('../components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/app/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: 'Dashboard', icon: 'dashboard' }
      },
      {
        path: 'dashboard-dynamic',
        name: 'DynamicDashboard',
        component: () => import('../views/dashboard/DynamicDashboardView.vue'),
        meta: { title: 'Dashboard Dinámico', icon: 'dashboard' }
      },

      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/ProfileView.vue'),
        meta: { title: 'Mi Perfil', icon: 'person' }
      },

      // Notifications (admin / cashier)
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('../views/dashboard/NotificationsView.vue'),
        meta: { title: 'Notificaciones', icon: 'notifications' }
      },
      {
        path: 'notifications/:id',
        name: 'NotificationDetail',
        component: () => import('../views/notifications/NotificationDetailView.vue'),
        meta: { title: 'Detalle de Notificación' }
      },

      // Products
      {
        path: 'products',
        name: 'Products',
        component: () => import('../views/products/ProductListView.vue'),
        meta: { title: 'Productos', icon: 'inventory' }
      },
      {
        path: 'products/create',
        name: 'ProductCreate',
        component: () => import('../views/products/ProductFormView.vue'),
        meta: { title: 'Nuevo Producto' }
      },
      {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        component: () => import('../views/products/ProductFormView.vue'),
        meta: { title: 'Editar Producto' }
      },
      {
        path: 'products/:id',
        name: 'ProductDetail',
        component: () => import('../views/products/ProductDetailView.vue'),
        meta: { title: 'Detalle del Producto' }
      },

      // Categories
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('../views/categories/CategoryListView.vue'),
        meta: { title: 'Categorías', icon: 'category' }
      },

      // Inventory
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('../views/inventory/InventoryView.vue'),
        meta: { title: 'Inventario', icon: 'warehouse' }
      },
      {
        path: 'inventory/product/:id',
        name: 'InventoryProductDetail',
        component: () => import('../views/inventory/InventoryDetailView.vue'),
        meta: { title: 'Detalle de Producto' }
      },
      {
        path: 'inventory/movements',
        name: 'InventoryMovements',
        component: () => import('../views/inventory/MovementsView.vue'),
        meta: { title: 'Movimientos de Inventario' }
      },
      {
        path: 'inventory/kardex/:productId?',
        name: 'InventoryKardex',
        component: () => import('../views/inventory/KardexView.vue'),
        meta: { title: 'Kardex' }
      },
      {
        path: 'inventory/adjustments',
        name: 'InventoryAdjustments',
        component: () => import('../views/inventory/AdjustmentsView.vue'),
        meta: { title: 'Ajustes de Inventario' }
      },
      {
        path: 'inventory/transfers',
        name: 'InventoryTransfers',
        component: () => import('../views/inventory/TransfersView.vue'),
        meta: { title: 'Transferencias' }
      },
      {
        path: 'inventory/verification',
        name: 'InventoryVerification',
        component: () => import('../views/inventory/VerificationView.vue'),
        meta: { title: 'Verificación de Inventario' }
      },

      // Sales
      {
        path: 'sales',
        name: 'Sales',
        component: () => import('../views/sales/SaleListView.vue'),
        meta: { title: 'Ventas', icon: 'point_of_sale' }
      },
      {
        path: 'sales/create',
        name: 'SaleCreate',
        component: () => import('../views/sales/SaleFormView.vue'),
        meta: { title: 'Nueva Venta' }
      },
      {
        path: 'sales/:id',
        name: 'SaleDetail',
        component: () => import('../views/sales/SaleDetailView.vue'),
        meta: { title: 'Detalle de Venta' }
      },

      // POS
      {
        path: 'pos',
        name: 'POS',
        component: () => import('../views/sales/POSView.vue'),
        meta: { title: 'Punto de Venta', icon: 'point_of_sale' }
      },
      {
        path: 'cash-register',
        name: 'CashRegister',
        component: () => import('../views/sales/CashRegisterView.vue'),
        meta: { title: 'Punto de Venta - Turnos', icon: 'account_balance' }
      },

      // Purchases
      {
        path: 'purchases',
        name: 'Purchases',
        component: () => import('../views/purchases/PurchaseListView.vue'),
        meta: { title: 'Compras', icon: 'shopping_cart' }
      },
      {
        path: 'purchases/create',
        name: 'PurchaseCreate',
        component: () => import('../views/purchases/PurchaseFormView.vue'),
        meta: { title: 'Nueva Compra' }
      },
      {
        path: 'purchases/:id',
        name: 'PurchaseDetail',
        component: () => import('../views/purchases/PurchaseDetailView.vue'),
        meta: { title: 'Detalle de Compra' }
      },

      // Suppliers
      {
        path: 'suppliers',
        name: 'Suppliers',
        component: () => import('../views/suppliers/SuppliersView.vue'),
        meta: { title: 'Proveedores', icon: 'local_shipping' }
      },

      // Clients
      {
        path: 'clients',
        name: 'Clients',
        component: () => import('../views/clients/ClientListView.vue'),
        meta: { title: 'Clientes', icon: 'people' }
      },
      {
        path: 'clients/:id',
        name: 'ClientDetail',
        component: () => import('../views/clients/ClientDetailView.vue'),
        meta: { title: 'Detalle del Cliente' }
      },

      // Invoices
      {
        path: 'invoices',
        name: 'Invoices',
        component: () => import('../views/invoices/InvoiceListView.vue'),
        meta: { title: 'Facturas', icon: 'receipt' }
      },
      {
        path: 'invoices/:id',
        name: 'InvoiceDetail',
        component: () => import('../views/invoices/InvoiceDetailView.vue'),
        meta: { title: 'Detalle de Factura' }
      },

      // Reports
      {
        path: 'reports',
        component: () => import('../views/reports/reporthomeview.vue'),
        meta: { title: 'Reportes', icon: 'bar_chart' },
        children: [
    {
        path: '',
        name: 'reports',
        component: () => import('../views/reports/ReportsView.vue'),
        meta: { title: 'Reporte de Ventas' }
      },
      {
        path: 'sales',
        name: 'SalesReport',
        component: () => import('../views/reports/SalesReportView.vue'),
        meta: { title: 'Reporte de Ventas' }
      },
      {
        path: 'inventory',
        name: 'InventoryReport',
        component: () => import('../views/reports/InventoryReportView.vue'),
        meta: { title: 'Reporte de Inventario' }
      },
      {
        path: 'top-products',
        name: 'TopProductsReport',
        component: () => import('../views/reports/TopProductsView.vue'),
        meta: { title: 'Productos Más Vendidos' }
      },
      {
        path: 'clients',
        name: 'ClientsReport',
        component: () => import('../views/reports/ClientsReportView.vue'),
        meta: { title: 'Reporte de Clientes' }
      },
      {
        path: 'cash-register',
        name: 'CashRegisterReport',
        component: () => import('../views/reports/CashRegisterReportView.vue'),
        meta: { title: 'Reporte de Caja' }
      },]
    },
      // Ecommerce (con tabs siempre visibles gracias a nested routes)
      {
        path: 'ecommerce',
        component: () => import('../views/ecommerce/EcommerceView.vue'),
        meta: { title: 'Ecommerce', icon: 'store' },
        children: [
          {
            path: '',
            name: 'EcommerceHome',
            component: () => import('../views/ecommerce/EcommerceHome.vue'),
            meta: { title: 'General' }
          },
          {
            path: 'banners',
            name: 'EcommerceBanners',
            component: () => import('../views/ecommerce/BannersView.vue'),
            meta: { title: 'Banners' }
          },
          {
            path: 'offers',
            name: 'EcommerceOffers',
            component: () => import('../views/ecommerce/OffersView.vue'),
            meta: { title: 'Ofertas' }
          },
          {
            path: 'hero',
            name: 'EcommerceHero',
            component: () => import('../views/ecommerce/HeroSettingsView.vue'),
            meta: { title: 'Configuración Hero' }
          },
          {
            path: 'hero-slides',
            name: 'EcommerceHeroSlides',
            component: () => import('../views/ecommerce/HeroSlidesView.vue'),
            meta: { title: 'Hero Carrusel' }
          },
          {
            path: 'floating-banners',
            name: 'EcommerceFloatingBanners',
            component: () => import('../views/ecommerce/FloatingBannersView.vue'),
            meta: { title: 'Banners Flotantes' }
          },
          {
            path: 'reviews',
            name: 'EcommerceReviews',
            component: () => import('../views/ecommerce/ReviewsModerationView.vue'),
            meta: { title: 'Moderación Reseñas' }
          },
          {
            path: 'coupons',
            name: 'EcommerceCoupons',
            component: () => import('../views/ecommerce/CouponsView.vue'),
            meta: { title: 'Cupones' }
          },
          {
            path: 'promotions',
            name: 'EcommercePromotions',
            component: () => import('../views/ecommerce/PromotionsView.vue'),
            meta: { title: 'Promociones' }
          },
          {
            path: 'settings',
            name: 'EcommerceSettings',
            component: () => import('../views/ecommerce/SettingsView.vue'),
            meta: { title: 'Configuración Tienda' }
          },
        ]
      },

      // Admin
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('../views/admin/AdminView.vue'),
        meta: { title: 'Administración', icon: 'admin_panel' }
      },
      {
        path: 'admin/users',
        name: 'AdminUsers',
        component: () => import('../views/admin/UsersView.vue'),
        meta: { title: 'Usuarios' }
      },
      {
        path: 'admin/users/:id',
        name: 'AdminUserDetail',
        component: () => import('../views/admin/UserDetailView.vue'),
        meta: { title: 'Detalle de Usuario' }
      },
      {
        path: 'admin/audit',
        name: 'AdminAudit',
        component: () => import('../views/admin/AuditLogView.vue'),
        meta: { title: 'Auditoría' }
      },
      {
        path: 'admin/audit/:id',
        name: 'AdminAuditDetail',
        component: () => import('../views/admin/AuditDetailView.vue'),
        meta: { title: 'Detalle de Auditoría' }
      },
      {
        path: 'admin/config',
        name: 'AdminConfig',
        component: () => import('../views/admin/ConfigView.vue'),
        meta: { title: 'Configuración del Sistema' }
      },

      // ============================================================
      // CRM — Pipeline & Leads
      // ============================================================
      {
        path: 'crm',
        name: 'CRMPipeline',
        component: () => import('../views/crm/PipelineView.vue'),
        meta: { title: 'Pipeline CRM' }
      },

      // ============================================================
      // PLATFORM ADMIN — Global SaaS management (requires admin role)
      // ============================================================
      {
        path: 'platform',
        component: () => import('../views/platform-admin/PlatformAdminView.vue'),
        meta: { title: 'Platform Admin', requiresAdmin: true },
        children: [
          {
            path: '',
            name: 'PlatformDashboard',
            component: () => import('../views/platform-admin/PlatformDashboard.vue'),
            meta: { title: 'Panel Global' }
          },
          {
            path: 'companies',
            name: 'PlatformCompanies',
            component: () => import('../views/platform-admin/CompaniesView.vue'),
            meta: { title: 'Empresas' }
          },
          {
            path: 'companies/create',
            name: 'PlatformCompanyCreate',
            component: () => import('../views/platform-admin/CompanyOnboardingView.vue'),
            meta: { title: 'Crear Empresa' }
          },
          {
            path: 'companies/:id',
            name: 'PlatformCompanyDetail',
            component: () => import('../views/platform-admin/CompanyDetailView.vue'),
            meta: { title: 'Detalle de Empresa' }
          },
          {
            path: 'users',
            name: 'PlatformUsers',
            component: () => import('../views/platform-admin/GlobalUsersView.vue'),
            meta: { title: 'Usuarios Globales' }
          },
          {
            path: 'impersonation',
            name: 'PlatformImpersonation',
            component: () => import('../views/platform-admin/ImpersonationLogView.vue'),
            meta: { title: 'Sesiones de Soporte' }
          },
        ]
      },

      // ── CMS & Page Builder ──
      {
        path: 'cms',
        name: 'CmsPages',
        component: () => import('../views/cms/PagesManagerView.vue'),
        meta: { title: 'CMS — Gestión de Páginas', requiresAuth: true }
      },
      // ── Form Builder ──
      {
        path: 'forms',
        name: 'FormBuilder',
        component: () => import('../views/forms/FormBuilderView.vue'),
        meta: { title: 'Form Builder', requiresAuth: true }
      },
      // ── Site Builder & Media ──
      {
        path: 'site',
        name: 'SiteBuilder',
        component: () => import('../views/site/SiteBuilderView.vue'),
        meta: { title: 'Site Builder & Media', requiresAuth: true }
      },
      // ── Integrations (Webhooks & Automations) ──
      {
        path: 'integrations',
        name: 'Integrations',
        component: () => import('../views/integrations/IntegrationsView.vue'),
        meta: { title: 'Integraciones & Automatizaciones', requiresAuth: true }
      },
      // ── RBAC & Feature Flags ──
      {
        path: 'rbac',
        name: 'RbacRolesFeatures',
        component: () => import('../views/rbac/RolesPermissionsView.vue'),
        meta: { title: 'RBAC & Feature Flags', requiresAuth: true }
      },
    ]
  },

  // Error
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/errors/NotFoundView.vue'),
    meta: { layout: 'blank', title: '404 - No Encontrado' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      const el = document.querySelector(to.hash);
      if (el) {
        return { el, behavior: 'smooth' };
      }
    }
    return { top: 0, behavior: 'smooth' };
  }
});

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const token = sessionStorage.getItem('accessToken');

  if (to.meta.requiresAuth && !token) {
    next('/');
    return;
  }

  // Si hay token pero el perfil no está cargado, cargarlo antes de continuar
  if (token && (to.meta.requiresAuth || to.meta.clientOnly)) {
    const { useAuthStore } = await import('../stores/auth');
    const authStore = useAuthStore();
    if (!authStore.user) {
      try {
        await authStore.fetchProfile();
      } catch (e) {
        // Si falla, redirigir al login
        authStore.clearAuth();
        next('/login');
        return;
      }
    }

    // Bloquear usuarios con rol "cliente" del dashboard /app/*
    if (authStore.user?.role === 'cliente' && to.path.startsWith('/app')) {
      next('/');
      return;
    }

    // Bloquear usuarios NO admin de rutas /app/platform/*
    if (to.path.startsWith('/app/platform') && authStore.user?.role_id !== 1) {
      next('/app/dashboard');
      return;
    }

    // Bloquear usuarios que NO son clientes de las rutas /account/*
    if (to.meta.clientOnly && authStore.user?.role !== 'cliente') {
      next('/');
      return;
    }
  }

  document.title = `${to.meta.title || 'Sistema de Gestión'} | PetCare Pro`;
  next();
});

export default router;
