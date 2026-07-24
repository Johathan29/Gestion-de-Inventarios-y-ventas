/**
 * Health Check Service
 * Monitorea el estado de todos los microservicios y la base de datos
 */

const http = require('http');

const SERVICE_TIMEOUT = 5000; // 5s timeout por servicio

// Lista de servicios a monitorear
const SERVICE_LIST = {
  auth: { host: 'localhost', port: 3001, path: '/health' },
  users: { host: 'localhost', port: 3002, path: '/health' },
  products: { host: 'localhost', port: 3003, path: '/health' },
  categories: { host: 'localhost', port: 3004, path: '/health' },
  inventory: { host: 'localhost', port: 3005, path: '/health' },
  purchases: { host: 'localhost', port: 3006, path: '/health' },
  sales: { host: 'localhost', port: 3007, path: '/health' },
  reports: { host: 'localhost', port: 3008, path: '/health' },
  invoices: { host: 'localhost', port: 3009, path: '/health' },
  ecommerce: { host: 'localhost', port: 3012, path: '/health' },
  catalog: { host: 'localhost', port: 3013, path: '/health' },
  email: { host: 'localhost', port: 3014, path: '/health' },
  whatsapp: { host: 'localhost', port: 3015, path: '/health' },
  notifications: { host: 'localhost', port: 3016, path: '/health' },
  audit: { host: 'localhost', port: 3017, path: '/health' },
  config: { host: 'localhost', port: 3018, path: '/health' }
};

/**
 * Verifica la salud de un servicio individual
 */
function checkService(serviceName, { host, port, path }) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: host, port, path, timeout: SERVICE_TIMEOUT }, (res) => {
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
    checkService(name, config)
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
