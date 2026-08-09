/**
 * Health Check Service
 * Monitorea el estado de todos los microservicios y la base de datos
 */

const http = require('http');

const SERVICE_TIMEOUT = 5000; // 5s timeout por servicio

// En Docker los contenedores se resuelven por nombre de servicio (red bridge);
// en desarrollo local se usa localhost. Configurable vía SERVICES_HOST.
//   local  → SERVICES_HOST=localhost (default)
//   docker → SERVICES_HOST=docker   (usa los nombres de contenedor de docker-compose)
const SERVICES_HOST = process.env.SERVICES_HOST || 'localhost';
const IS_DOCKER = SERVICES_HOST === 'docker';

// Mapeo servicio → nombre de contenedor en docker-compose
const DOCKER_HOST_MAP = {
  auth: 'auth-service',
  users: 'user-service',
  products: 'product-service',
  categories: 'category-service',
  inventory: 'inventory-service',
  purchases: 'purchase-service',
  sales: 'sale-service',
  reports: 'report-service',
  invoices: 'invoice-service',
  ecommerce: 'ecommerce-service',
  catalog: 'catalog-service',
  email: 'email-service',
  whatsapp: 'whatsapp-service',
  notifications: 'notification-service',
  audit: 'audit-service',
  config: 'config-service',
  payments: 'payment-service',
  'platform-admin': 'platform-admin-service',
  cms: 'cms-service',
  'form-builder': 'form-builder-service',
  'site-builder': 'site-builder-service',
  integration: 'integration-service',
};

function resolveHost(serviceName) {
  return IS_DOCKER ? (DOCKER_HOST_MAP[serviceName] || serviceName) : SERVICES_HOST;
}

// Lista de servicios a monitorear (host se resuelve dinámicamente)
const SERVICE_LIST = {
  auth: { port: 3001, path: '/health' },
  users: { port: 3002, path: '/health' },
  products: { port: 3003, path: '/health' },
  categories: { port: 3004, path: '/health' },
  inventory: { port: 3005, path: '/health' },
  purchases: { port: 3006, path: '/health' },
  sales: { port: 3007, path: '/health' },
  reports: { port: 3008, path: '/health' },
  invoices: { port: 3009, path: '/health' },
  ecommerce: { port: 3012, path: '/health' },
  catalog: { port: 3013, path: '/health' },
  email: { port: 3014, path: '/health' },
  whatsapp: { port: 3015, path: '/health' },
  notifications: { port: 3016, path: '/health' },
  audit: { port: 3017, path: '/health' },
  config: { port: 3018, path: '/health' },
  payments: { port: 3019, path: '/health' },
  'platform-admin': { port: 3020, path: '/health' },
  cms: { port: 3021, path: '/health' },
  'form-builder': { port: 3022, path: '/health' },
  'site-builder': { port: 3023, path: '/health' },
  integration: { port: 3024, path: '/health' },
};

/**
 * Verifica la salud de un servicio individual
 */
function checkService(serviceName, { host, port, path }) {
  const hostname = host || resolveHost(serviceName);
  return new Promise((resolve) => {
    const req = http.get({ hostname, port, path, timeout: SERVICE_TIMEOUT }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            service: serviceName,
            status: res.statusCode === 200 ? 'healthy' : 'degraded',
            statusCode: res.statusCode,
            response: parsed,
            latency: null
          });
        } catch {
          resolve({
            service: serviceName,
            status: 'degraded',
            statusCode: res.statusCode,
            response: data.substring(0, 200),
            latency: null
          });
        }
      });
    });

    const startTime = Date.now();

    req.on('response', (res) => {
      res.once('readable', () => {
        const latency = Date.now() - startTime;
        // Attach latency to the resolved promise — we handle it in the 'end' event
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ service: serviceName, status: 'unhealthy', error: 'TIMEOUT', latency: SERVICE_TIMEOUT });
    });

    req.on('error', (err) => {
      resolve({ service: serviceName, status: 'unhealthy', error: err.code || err.message, latency: Date.now() - startTime });
    });
  });
}

/**
 * Verifica todos los servicios en paralelo
 */
async function checkAllServices() {
  const checks = Object.entries(SERVICE_LIST).map(([name, config]) =>
    checkService(name, { ...config, host: resolveHost(name) })
  );
  const results = await Promise.all(checks);

  const services = {};
  let healthyCount = 0;
  let degradedCount = 0;
  let unhealthyCount = 0;

  results.forEach(r => {
    services[r.service] = {
      status: r.status,
      statusCode: r.statusCode || null,
      latency: r.latency,
      error: r.error || null,
      response: r.response || null
    };
    if (r.status === 'healthy') healthyCount++;
    else if (r.status === 'degraded') degradedCount++;
    else unhealthyCount++;
  });

  return {
    status: unhealthyCount === 0 ? (degradedCount > 0 ? 'degraded' : 'healthy') : 'unhealthy',
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      healthy: healthyCount,
      degraded: degradedCount,
      unhealthy: unhealthyCount
    },
    services
  };
}

/**
 * Obtiene la lista de servicios disponibles
 */
function getServiceList() {
  return Object.keys(SERVICE_LIST);
}

module.exports = {
  checkService,
  checkAllServices,
  getServiceList,
  SERVICE_LIST
};
