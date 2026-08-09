const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');
const { serviceRoutes, services, SERVICE_TIMEOUTS } = require('./routes');
const { correlationIdMiddleware, CORRELATION_HEADER } = require('../../shared/middleware/correlationId');
const { checkAllServices, checkService, getServiceList } = require('../../shared/middleware/healthCheck');
const { getCircuitBreaker, getAllCircuitStates } = require('../../shared/middleware/circuitBreaker');

dotenv.config();

const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================================
// 1. SEGURIDAD (Helmet mejorado)
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ============================================================
// 2. COMPRESIÓN
// ============================================================
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// ============================================================
// 3. CORS SEGURO
// ============================================================
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  process.env.CORS_ORIGIN_ALTERNATE || 'http://localhost:3000',
  'http://localhost:4173'
].filter(Boolean);

app.use(cors({
  origin: isProduction ? process.env.CORS_ORIGIN : allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-requested-with'],
  exposedHeaders: ['x-correlation-id', 'x-request-id'],
  credentials: true,
  maxAge: 86400 // 24h preflight cache
}));

// ============================================================
// 4. CORRELATION ID (Trazabilidad distribuida)
// ============================================================
app.use(correlationIdMiddleware);

// ============================================================
// 5. RATE LIMITING MEJORADO
// ============================================================
// Global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.GLOBAL_RATE_LIMIT) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Límite global de solicitudes excedido. Intente nuevamente en 15 minutos.'
    }
  }
});
app.use(globalLimiter);

// Rate limiters específicos por ruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 intentos de login cada 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Demasiados intentos de autenticación. Intente nuevamente en 15 minutos.'
    }
  }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200, // 200 requests/min para APIs generales
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'API_RATE_LIMIT',
      message: 'Demasiadas solicitudes. Reduzca la velocidad.'
    }
  }
});

// ============================================================
// 5b. RATE LIMITING POR TENANT (multi-tenant)
// ============================================================
// Agrupa las solicitudes por company_id (extraído del JWT o del
// header x-company-id). Impide que un tenant acapare los límites
// de otro o que un solo tenant sature el gateway.
//
// Nota: el JWT aquí SOLO se decodifica para derivar la clave de
// agrupación del rate limit; la autenticación real la hacen los
// microservicios verificando la firma.
function extractCompanyId(req) {
  // 1) Header explícito (lo envía el frontend tras login)
  if (req.headers['x-company-id']) return `t:${req.headers['x-company-id']}`;

  // 2) JWT Bearer — decodificar payload sin verificar firma (solo agrupación)
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (payload.company_id || payload.companyId) {
          return `t:${payload.company_id || payload.companyId}`;
        }
      }
    } catch (_) { /* token inválido — fallar a IP */ }
  }

  // 3) Fallback: IP
  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
}

const tenantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.TENANT_RATE_LIMIT) || 600, // 600 req/min por tenant
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => extractCompanyId(req),
  message: {
    success: false,
    error: {
      code: 'TENANT_RATE_LIMIT',
      message: 'Límite de solicitudes para su organización excedido. Intente nuevamente en un minuto.'
    }
  }
});

// ============================================================
// 6. ENDPOINTS DE HEALTH CHECK
// ============================================================

// Health check simple del gateway
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: '2.0.0',
    correlationId: req.correlationId,
    uptime: process.uptime()
  });
});

// Health check detallado de todos los servicios
app.get('/health/services', async (req, res) => {
  try {
    const healthReport = await checkAllServices();
    res.json({
      ...healthReport,
      correlationId: req.correlationId,
      gateway: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '2.0.0'
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error verificando servicios',
      error: err.message,
      correlationId: req.correlationId
    });
  }
});

// Health check de un servicio específico
app.get('/health/services/:name', async (req, res) => {
  const { name } = req.params;
  const serviceConfig = services[name];

  if (!serviceConfig) {
    return res.status(404).json({
      status: 'not_found',
      message: `Servicio "${name}" no encontrado`,
      available: getServiceList()
    });
  }

  try {
    const result = await checkService(name, {
      host: 'localhost',
      port: serviceConfig.port,
      path: '/health'
    });
    res.json({ ...result, correlationId: req.correlationId });
  } catch (err) {
    res.status(503).json({
      service: name,
      status: 'unhealthy',
      error: err.message,
      correlationId: req.correlationId
    });
  }
});

// Estado de los circuit breakers
app.get('/health/circuit-breakers', (req, res) => {
  res.json({
    circuitBreakers: getAllCircuitStates(),
    correlationId: req.correlationId
  });
});

// ============================================================
// 7. APLICAR RATE LIMITERS ESPECÍFICOS
// ============================================================
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/api', apiLimiter);
app.use('/api/v1/api', tenantLimiter);

// ============================================================
// 8. RUTAS DE MICROSERVICIOS (antes de express.json para proxys)
// ============================================================
app.use('/api/v1', serviceRoutes);

// ============================================================
// 9. PARSEO DE JSON (solo rutas sin proxy)
// ============================================================
app.use(express.json({ limit: process.env.MAX_BODY_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_BODY_SIZE || '10mb' }));

// ============================================================
// 10. MANEJO DE ERRORES GLOBAL MEJORADO
// ============================================================
app.use((err, req, res, next) => {
  const correlationId = req.correlationId || 'unknown';
  const statusCode = err.status || err.statusCode || 500;

  console.error(`[${correlationId}] Gateway Error:`, {
    message: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.originalUrl,
    method: req.method,
    statusCode
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'GATEWAY_ERROR',
      message: isProduction && statusCode === 500
        ? 'Error interno del servidor'
        : err.message || 'Error en el gateway',
      correlationId,
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================
// 11. 404 MEJORADO
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Ruta ${req.originalUrl} no encontrada`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================
// 12. INICIO DEL SERVIDOR
// ============================================================
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 API Gateway v2.0.0`);
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔍 Services: http://localhost:${PORT}/health/services`);
  console.log(`🔄 Microservicios montados en /api/v1/`);
  console.log(`🔒 Rate limit global: ${process.env.GLOBAL_RATE_LIMIT || 1000}/15min`);
  console.log(`🌐 CORS: ${isProduction ? process.env.CORS_ORIGIN : allowedOrigins.join(', ')}`);
  console.log(`📊 Compresión: ${isProduction ? 'Habilitada' : 'Habilitada'}`);
  console.log(`========================================`);
});

module.exports = app;
