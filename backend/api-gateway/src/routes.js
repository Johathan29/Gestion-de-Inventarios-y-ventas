const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const router = express.Router();
const { getCircuitBreaker } = require('../../shared/middleware/circuitBreaker');
const { CORRELATION_HEADER } = require('../../shared/middleware/correlationId');

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
  },
  onError: (err, req, res) => {
    console.error(`[Gateway][checkout] Error: ${err.message} [${req.correlationId || 'no-id'}]`);
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Servicio checkout no disponible', service: 'checkout', correlationId: req.correlationId || null, timestamp: new Date().toISOString() }
    });
  }
});
router.use(checkoutProxy);

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

// Crear proxies resilientes para cada servicio
Object.entries(services).forEach(([name, service]) => {
  const proxy = createResilientProxy(name, service);
  router.use(proxy);
});

module.exports = { router, serviceRoutes: router, services, SERVICE_TIMEOUTS };
