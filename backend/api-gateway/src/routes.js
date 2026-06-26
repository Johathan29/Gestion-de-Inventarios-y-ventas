const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const router = express.Router();

const services = {
  auth: { target: 'http://localhost:3001', path: '/auth' },
  users: { target: 'http://localhost:3002', path: '/users' },
  products: { target: 'http://localhost:3003', path: '/products' },
  categories: { target: 'http://localhost:3004', path: '/categories' },
  inventory: { target: 'http://localhost:3005', path: '/inventory' },
  purchases: { target: 'http://localhost:3006', path: '/purchases' },
  sales: { target: 'http://localhost:3007', path: '/sales' },
  reports: { target: 'http://localhost:3008', path: '/reports' },
  invoices: { target: 'http://localhost:3009', path: '/invoices' },
  cart: { target: 'http://localhost:3010', path: '/cart' },
  checkout: { target: 'http://localhost:3011', path: '/checkout' },
  ecommerce: { target: 'http://localhost:3012', path: '/ecommerce' },
  catalog: { target: 'http://localhost:3013', path: '/catalog' },
  email: { target: 'http://localhost:3014', path: '/email' },
  whatsapp: { target: 'http://localhost:3015', path: '/whatsapp' },
  notifications: { target: 'http://localhost:3016', path: '/notifications' },
  audit: { target: 'http://localhost:3017', path: '/audit' },
  config: { target: 'http://localhost:3018', path: '/config' }
};

// Crear proxies para cada servicio
Object.entries(services).forEach(([name, service]) => {
  // Context como primer argumento = path filter para que el proxy vea la URL completa
  // y pueda hacer pathRewrite correctamente
  const proxy = createProxyMiddleware(`/api/v1${service.path}`, {
    target: service.target,
    changeOrigin: true,
    // Convierte /api/v1/products -> /api/products (los servicios usan /api/XXX)
    pathRewrite: {
      [`^/api/v1${service.path}`]: `/api${service.path}`
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Gateway] ${req.method} ${req.originalUrl} -> ${service.target}${proxyReq.path}`);
    },
    onError: (err, req, res) => {
      console.error(`[Gateway] Error en ${name}:`, err.message);
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `Servicio ${name} no disponible`,
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  router.use(proxy);
});

module.exports = { router, serviceRoutes: router, services };
