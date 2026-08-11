const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const router = express.Router();
const { getCircuitBreaker } = require('../../shared/middleware/circuitBreaker');
const { CORRELATION_HEADER } = require('../../shared/middleware/correlationId');
const { REQUEST_ID_HEADER, TRACE_ID_HEADER } = require('../../shared/middleware/requestId');
const { recordCheckout } = require('../../shared/middleware/metrics');

// Timeouts por servicio (ms)
const SERVICE_TIMEOUTS = {
  auth: 10000,
  users: 10000,
  products: 15000,
  categories: 10000,
  inventory: 15000,
  purchases: 20000,
  sales: 20000,
  reports: 30000,
  invoices: 15000,
  ecommerce: 15000,
  catalog: 15000,
  email: 20000,
  whatsapp: 10000,
  notifications: 10000,
  audit: 10000,
  config: 10000,
  cart: 15000,
  checkout: 20000,
  clients: 10000
};

const services = {
  auth: { target: 'http://localhost:3001', path: '/auth', port: 3001 },
  users: { target: 'http://localhost:3001', path: '/users', port: 3001 },
  products: { target: 'http://localhost:3003', path: '/products', port: 3003 },
  categories: { target: 'http://localhost:3004', path: '/categories', port: 3004 },
  inventory: { target: 'http://localhost:3005', path: '/inventory', port: 3005 },
  purchases: { target: 'http://localhost:3006', path: '/purchases', port: 3006 },
  sales: { target: 'http://localhost:3007', path: '/sales', port: 3007 },
  reports: { target: 'http://localhost:3008', path: '/reports', port: 3008 },
  invoices: { target: 'http://localhost:3009', path: '/invoices', port: 3009 },
  ecommerce: { target: 'http://localhost:3012', path: '/ecommerce', port: 3012 },
  catalog: { target: 'http://localhost:3013', path: '/catalog', port: 3013 },
  email: { target: 'http://localhost:3014', path: '/email', port: 3014 },
  whatsapp: { target: 'http://localhost:3015', path: '/whatsapp', port: 3015 },
  notifications: { target: 'http://localhost:3016', path: '/notifications', port: 3016 },
  audit: { target: 'http://localhost:3017', path: '/audit', port: 3017 },
  config: { target: 'http://localhost:3018', path: '/config', port: 3018 }
};

/**
 * Crea un proxy middleware con Circuit Breaker, Timeout y tracing
 */
function createResilientProxy(name, service) {
  const timeout = SERVICE_TIMEOUTS[name] || 15000;
  const circuitBreaker = getCircuitBreaker(name, {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000
  });

  const proxy = createProxyMiddleware(`/api/v1${service.path}`, {
    target: service.target,
    changeOrigin: true,
    proxyTimeout: timeout,
    timeout: timeout,
    pathRewrite: {
      [`^/api/v1${service.path}`]: `/api${service.path}`
    },
    onProxyReq: (proxyReq, req, res) => {
      // Propagar Correlation ID
      if (req.correlationId) {
        proxyReq.setHeader('x-correlation-id', req.correlationId);
      }
      // Fase 9: propagar request_id / trace_id (trazabilidad distribuida)
      if (req.requestId || req.headers[REQUEST_ID_HEADER]) {
        proxyReq.setHeader(REQUEST_ID_HEADER, req.requestId || req.headers[REQUEST_ID_HEADER]);
      }
      if (req.traceId || req.headers[TRACE_ID_HEADER]) {
        proxyReq.setHeader(TRACE_ID_HEADER, req.traceId || req.headers[TRACE_ID_HEADER]);
      }
      // Propagar usuario actual si está autenticado
      if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.id);
        proxyReq.setHeader('x-user-role', req.user.role);
      }
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[Gateway][${name}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms) [${req.correlationId || 'no-id'}]`);
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      // Propagar Correlation ID desde respuesta del servicio
      if (!res.getHeader('x-correlation-id') && req.correlationId) {
        res.setHeader('x-correlation-id', req.correlationId);
      }
      if (!res.getHeader(REQUEST_ID_HEADER) && (req.requestId || req.headers[REQUEST_ID_HEADER])) {
        res.setHeader(REQUEST_ID_HEADER, req.requestId || req.headers[REQUEST_ID_HEADER]);
      }
      if (!res.getHeader(TRACE_ID_HEADER) && (req.traceId || req.headers[TRACE_ID_HEADER])) {
        res.setHeader(TRACE_ID_HEADER, req.traceId || req.headers[TRACE_ID_HEADER]);
      }
    },
    onError: (err, req, res) => {
      console.error(`[Gateway][${name}] Error:`, err.message, `[${req.correlationId || 'no-id'}]`);

      // Reportar fallo al Circuit Breaker
      try {
        circuitBreaker.onFailure();
      } catch (e) { /* ignore */ }

      const isTimeout = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.message.includes('timeout');

      res.status(isTimeout ? 504 : 503).json({
        success: false,
        error: {
          code: isTimeout ? 'GATEWAY_TIMEOUT' : 'SERVICE_UNAVAILABLE',
          message: isTimeout
            ? `Servicio ${name} no respondió en ${timeout}ms`
            : `Servicio ${name} no disponible`,
          service: name,
          correlationId: req.correlationId || null,
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  return proxy;
}

// Cart y Checkout se manejan dentro del sale-service (puerto 3007)
// Requieren rewrite especial: /api/v1/cart -> /api/sales/cart
const cartProxy = createProxyMiddleware('/api/v1/cart', {
  target: 'http://localhost:3007',
  changeOrigin: true,
  proxyTimeout: SERVICE_TIMEOUTS.cart,
  timeout: SERVICE_TIMEOUTS.cart,
  pathRewrite: { '^/api/v1/cart': '/api/sales/cart' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);
    console.log(`[Gateway][cart] ${req.method} ${req.originalUrl} [${req.correlationId || 'no-id'}]`);
  },
  onProxyRes: (proxyRes, req, res) => {
    if (!res.getHeader('x-correlation-id') && req.correlationId) res.setHeader('x-correlation-id', req.correlationId);
  },
  onError: (err, req, res) => {
    console.error(`[Gateway][cart] Error: ${err.message} [${req.correlationId || 'no-id'}]`);
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Servicio cart no disponible', service: 'cart', correlationId: req.correlationId || null, timestamp: new Date().toISOString() }
    });
  }
});
router.use(cartProxy);

const checkoutProxy = createProxyMiddleware('/api/v1/checkout', {
  target: 'http://localhost:3007',
  changeOrigin: true,
  proxyTimeout: SERVICE_TIMEOUTS.checkout,
  timeout: SERVICE_TIMEOUTS.checkout,
  pathRewrite: { '^/api/v1/checkout': '/api/sales/checkout' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);
    console.log(`[Gateway][checkout] ${req.method} ${req.originalUrl} [${req.correlationId || 'no-id'}]`);
  },
  onProxyRes: (proxyRes, req, res) => {
    if (!res.getHeader('x-correlation-id') && req.correlationId) res.setHeader('x-correlation-id', req.correlationId);
    // Fase 9: métricas de checkout (success/failure)
    recordCheckout(res.statusCode < 400);
  },
  onError: (err, req, res) => {
    console.error(`[Gateway][checkout] Error: ${err.message} [${req.correlationId || 'no-id'}]`);
    recordCheckout(false);
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Servicio checkout no disponible', service: 'checkout', correlationId: req.correlationId || null, timestamp: new Date().toISOString() }
    });
  }
});
router.use(checkoutProxy);

// Promotions — se sirve desde ecommerce-service en puerto 3012
// rewrite: /api/v1/promotions/* -> /api/ecommerce/promotions/*
const promotionsProxy = createProxyMiddleware('/api/v1/promotions', {
  target: 'http://localhost:3012',
  changeOrigin: true,
  proxyTimeout: SERVICE_TIMEOUTS.ecommerce,
  timeout: SERVICE_TIMEOUTS.ecommerce,
  pathRewrite: { '^/api/v1/promotions': '/api/ecommerce/promotions' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);
    if (req.user) { proxyReq.setHeader('x-user-id', req.user.id); proxyReq.setHeader('x-user-role', req.user.role); }
    console.log(`[Gateway][promotions] ${req.method} ${req.originalUrl} [${req.correlationId || 'no-id'}]`);
  },
  onProxyRes: (proxyRes, req, res) => {
    if (!res.getHeader('x-correlation-id') && req.correlationId) res.setHeader('x-correlation-id', req.correlationId);
  },
  onError: (err, req, res) => {
    console.error(`[Gateway][promotions] Error: ${err.message}`);
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Promotions service unavailable', service: 'promotions', correlationId: req.correlationId || null, timestamp: new Date().toISOString() }
    });
  }
});
router.use(promotionsProxy);

// Cash Register — se sirve desde payment-service en puerto 3019
// rewrite: /api/v1/cash-register/* -> /api/payments/registers/*
const cashRegisterProxy = createProxyMiddleware('/api/v1/cash-register', {
  target: 'http://localhost:3019',
  changeOrigin: true,
  proxyTimeout: 15000,
  timeout: 15000,
  pathRewrite: { '^/api/v1/cash-register': '/api/payments/registers' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);
    if (req.user) {
      proxyReq.setHeader('x-user-id', req.user.id);
      proxyReq.setHeader('x-user-role', req.user.role);
    }
    console.log(`[Gateway][cash-register] ${req.method} ${req.originalUrl} [${req.correlationId || 'no-id'}]`);
  },
  onProxyRes: (proxyRes, req, res) => {
    if (!res.getHeader('x-correlation-id') && req.correlationId) res.setHeader('x-correlation-id', req.correlationId);
  },
  onError: (err, req, res) => {
    console.error(`[Gateway][cash-register] Error: ${err.message} [${req.correlationId || 'no-id'}]`);
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Servicio cash-register no disponible', service: 'cash-register', correlationId: req.correlationId || null, timestamp: new Date().toISOString() }
    });
  }
});
router.use(cashRegisterProxy);

// Clients (CRM) — se sirve desde user-service en puerto 3002
// rewrite: /api/v1/clients/* -> /api/users/*
const clientsProxy = createProxyMiddleware('/api/v1/clients', {
  target: 'http://localhost:3002',
  changeOrigin: true,
  proxyTimeout: SERVICE_TIMEOUTS.clients,
  timeout: SERVICE_TIMEOUTS.clients,
  pathRewrite: { '^/api/v1/clients': '/api/users' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);
    if (req.user) {
      proxyReq.setHeader('x-user-id', req.user.id);
      proxyReq.setHeader('x-user-role', req.user.role);
    }
    console.log(`[Gateway][clients] ${req.method} ${req.originalUrl} [${req.correlationId || 'no-id'}]`);
  },
  onProxyRes: (proxyRes, req, res) => {
    if (!res.getHeader('x-correlation-id') && req.correlationId) res.setHeader('x-correlation-id', req.correlationId);
  },
  onError: (err, req, res) => {
    console.error(`[Gateway][clients] Error: ${err.message} [${req.correlationId || 'no-id'}]`);
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Servicio clients no disponible', service: 'clients', correlationId: req.correlationId || null, timestamp: new Date().toISOString() }
    });
  }
});
router.use(clientsProxy);

// Platform Admin — service on port 3020
// rewrite: /api/v1/platform-admin/* -> /api/platform/*
const platformAdminProxy = createProxyMiddleware('/api/v1/platform-admin', {
  target: 'http://localhost:3020',
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: { '^/api/v1/platform-admin': '/api/platform' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);
    if (req.user) {
      proxyReq.setHeader('x-user-id', req.user.id);
      proxyReq.setHeader('x-user-role', req.user.role);
    }
    console.log(`[Gateway][platform-admin] ${req.method} ${req.originalUrl} [${req.correlationId || 'no-id'}]`);
  },
  onProxyRes: (proxyRes, req, res) => {
    if (!res.getHeader('x-correlation-id') && req.correlationId) res.setHeader('x-correlation-id', req.correlationId);
  },
  onError: (err, req, res) => {
    console.error(`[Gateway][platform-admin] Error: ${err.message} [${req.correlationId || 'no-id'}]`);
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Servicio platform-admin no disponible', service: 'platform-admin', correlationId: req.correlationId || null, timestamp: new Date().toISOString() }
    });
  }
});
router.use(platformAdminProxy);

// ── NEW SaaS SERVICES ───────────────────────────────────────────────

// CMS Service — port 3021
// rewrite: /api/v1/cms/* -> /api/cms/*
const cmsProxy = createProxyMiddleware('/api/v1/cms', {
  target: 'http://localhost:3021',
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: { '^/api/v1/cms': '/api/cms' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);
    if (req.user) { proxyReq.setHeader('x-user-id', req.user.id); proxyReq.setHeader('x-user-role', req.user.role); }
    console.log(`[Gateway][cms] ${req.method} ${req.originalUrl} [${req.correlationId || 'no-id'}]`);
  },
  onProxyRes: (proxyRes, req, res) => { if (!res.getHeader('x-correlation-id') && req.correlationId) res.setHeader('x-correlation-id', req.correlationId); },
  onError: (err, req, res) => { console.error(`[Gateway][cms] Error: ${err.message}`); res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'CMS service unavailable', service: 'cms' }}); }
});
router.use(cmsProxy);

// Form Builder Service — port 3022
const formBuilderProxy = createProxyMiddleware('/api/v1/forms', {
  target: 'http://localhost:3022',
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: { '^/api/v1/forms': '/api/forms' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);
    if (req.user) { proxyReq.setHeader('x-user-id', req.user.id); proxyReq.setHeader('x-user-role', req.user.role); }
    console.log(`[Gateway][forms] ${req.method} ${req.originalUrl} [${req.correlationId || 'no-id'}]`);
  },
  onProxyRes: (proxyRes, req, res) => { if (!res.getHeader('x-correlation-id') && req.correlationId) res.setHeader('x-correlation-id', req.correlationId); },
  onError: (err, req, res) => { console.error(`[Gateway][forms] Error: ${err.message}`); res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Form Builder service unavailable', service: 'forms' }}); }
});
router.use(formBuilderProxy);

// Site Builder Service — port 3023
const siteBuilderProxy = createProxyMiddleware('/api/v1/site', {
  target: 'http://localhost:3023',
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: { '^/api/v1/site': '/api/site' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);
    if (req.user) { proxyReq.setHeader('x-user-id', req.user.id); proxyReq.setHeader('x-user-role', req.user.role); }
    console.log(`[Gateway][site] ${req.method} ${req.originalUrl} [${req.correlationId || 'no-id'}]`);
  },
  onProxyRes: (proxyRes, req, res) => { if (!res.getHeader('x-correlation-id') && req.correlationId) res.setHeader('x-correlation-id', req.correlationId); },
  onError: (err, req, res) => { console.error(`[Gateway][site] Error: ${err.message}`); res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Site Builder service unavailable', service: 'site' }}); }
});
router.use(siteBuilderProxy);

// Integration Service (Webhooks & Automations) — port 3024
const integrationProxy = createProxyMiddleware('/api/v1/integrations', {
  target: 'http://localhost:3024',
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: { '^/api/v1/integrations': '/api/integrations' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);
    if (req.user) { proxyReq.setHeader('x-user-id', req.user.id); proxyReq.setHeader('x-user-role', req.user.role); }
    console.log(`[Gateway][integrations] ${req.method} ${req.originalUrl} [${req.correlationId || 'no-id'}]`);
  },
  onProxyRes: (proxyRes, req, res) => { if (!res.getHeader('x-correlation-id') && req.correlationId) res.setHeader('x-correlation-id', req.correlationId); },
  onError: (err, req, res) => { console.error(`[Gateway][integrations] Error: ${err.message}`); res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Integration service unavailable', service: 'integrations' }}); }
});
router.use(integrationProxy);

// Crear proxies resilientes para cada servicio
Object.entries(services).forEach(([name, service]) => {
  const proxy = createResilientProxy(name, service);
  router.use(proxy);
});

module.exports = { router, serviceRoutes: router, services, SERVICE_TIMEOUTS };
