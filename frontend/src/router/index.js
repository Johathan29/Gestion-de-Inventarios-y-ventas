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
      }
    ]
  },

  // Main layout routes (dashboard and protected pages)
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
        name: 'Reports',
        component: () => import('../views/reports/ReportsView.vue'),
        meta: { title: 'Reportes', icon: 'bar_chart' }
      },
      {
        path: 'reports/sales',
        name: 'SalesReport',
        component: () => import('../views/reports/SalesReportView.vue'),
        meta: { title: 'Reporte de Ventas' }
      },
      {
        path: 'reports/inventory',
        name: 'InventoryReport',
        component: () => import('../views/reports/InventoryReportView.vue'),
        meta: { title: 'Reporte de Inventario' }
      },
      {
        path: 'reports/top-products',
        name: 'TopProductsReport',
        component: () => import('../views/reports/TopProductsView.vue'),
        meta: { title: 'Productos Más Vendidos' }
      },
      {
        path: 'reports/clients',
        name: 'ClientsReport',
        component: () => import('../views/reports/ClientsReportView.vue'),
        meta: { title: 'Reporte de Clientes' }
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
        path: 'admin/config',
        name: 'AdminConfig',
        component: () => import('../views/admin/ConfigView.vue'),
        meta: { title: 'Configuración del Sistema' }
      }
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
