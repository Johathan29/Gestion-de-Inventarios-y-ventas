/**
 * Metrics Registry (Fase 9 — Observabilidad)
 *
 * Métricas en memoria con formato Prometheus (text exposition v0.0.4):
 *  - aurora_http_requests_total{method,route,status}
 *  - aurora_http_request_duration_seconds (histograma global)
 *  - aurora_http_errors_total{code}
 *  - aurora_checkout_success_total / aurora_checkout_failure_total
 *  - aurora_payment_success_total / aurora_payment_failure_total
 *  - aurora_webhook_failure_total
 *
 * Middleware: metricsMiddleware registra cada request que pasa por el
 * gateway. Handler: metricsHandler sirve GET /metrics.
 */

const DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// Contadores internos
const requests = new Map();     // `${method}|${route}|${status}` → count
const errors = new Map();       // code → count
const histogram = {             // duración global en segundos
  buckets: DURATION_BUCKETS.map(() => 0),
  sum: 0,
  count: 0,
};
const business = {
  checkout_success: 0,
  checkout_failure: 0,
  payment_success: 0,
  payment_failure: 0,
  webhook_failure: 0,
};

const startedAt = Date.now();

/** Deriva una ruta estable para etiquetas (evita cardinalidad explosiva) */
function getRoute(req) {
  if (req.route && req.route.path) return req.route.path;
  const url = (req.originalUrl || req.url || '/').split('?')[0];
  const parts = url.split('/').filter(Boolean);
  // /api/v1/<servicio>/<recurso> — agrupar por servicio+recurso
  return '/' + parts.slice(0, 4).join('/');
}

function inc(map, key, n = 1) {
  map.set(key, (map.get(key) || 0) + n);
}

// ============================================================
// API pública
// ============================================================

function recordRequest(method, route, status, durationMs) {
  inc(requests, `${method}|${route}|${status}`);
  const seconds = durationMs / 1000;
  histogram.sum += seconds;
  histogram.count += 1;
  for (let i = 0; i < DURATION_BUCKETS.length; i++) {
    if (seconds <= DURATION_BUCKETS[i]) histogram.buckets[i] += 1;
  }
}

function recordError(code) {
  inc(errors, code || 'UNKNOWN');
}

function recordCheckout(success) {
  if (success) business.checkout_success += 1;
  else business.checkout_failure += 1;
}

function recordPayment(success) {
  if (success) business.payment_success += 1;
  else business.payment_failure += 1;
}

function recordWebhookFailure() {
  business.webhook_failure += 1;
}

function reset() {
  requests.clear();
  errors.clear();
  histogram.buckets = DURATION_BUCKETS.map(() => 0);
  histogram.sum = 0;
  histogram.count = 0;
  for (const k of Object.keys(business)) business[k] = 0;
}

/** Formato texto Prometheus */
function renderMetrics() {
  const lines = [];
  const now = Math.floor(Date.now() / 1000);

  lines.push('# HELP aurora_http_requests_total Total de peticiones HTTP procesadas por el gateway.');
  lines.push('# TYPE aurora_http_requests_total counter');
  for (const [key, value] of [...requests.entries()].sort()) {
    const [method, route, status] = key.split('|');
    lines.push(`aurora_http_requests_total{method="${method}",route="${route}",status="${status}"} ${value}`);
  }

  lines.push('# HELP aurora_http_request_duration_seconds Duración de peticiones HTTP en segundos.');
  lines.push('# TYPE aurora_http_request_duration_seconds histogram');
  let cumulative = 0;
  for (let i = 0; i < DURATION_BUCKETS.length; i++) {
    cumulative = histogram.buckets[i];
    lines.push(`aurora_http_request_duration_seconds_bucket{le="${DURATION_BUCKETS[i]}"} ${cumulative}`);
  }
  lines.push(`aurora_http_request_duration_seconds_bucket{le="+Inf"} ${histogram.count}`);
  lines.push(`aurora_http_request_duration_seconds_sum ${histogram.sum.toFixed(6)}`);
  lines.push(`aurora_http_request_duration_seconds_count ${histogram.count}`);

  lines.push('# HELP aurora_http_errors_total Errores HTTP por código (4xx/5xx).');
  lines.push('# TYPE aurora_http_errors_total counter');
  for (const [code, value] of [...errors.entries()].sort()) {
    lines.push(`aurora_http_errors_total{code="${code}"} ${value}`);
  }

  const businessMetrics = [
    ['aurora_checkout_success_total', 'Checkouts exitosos.'],
    ['aurora_checkout_failure_total', 'Checkouts fallidos.'],
    ['aurora_payment_success_total', 'Pagos exitosos.'],
    ['aurora_payment_failure_total', 'Pagos fallidos.'],
    ['aurora_webhook_failure_total', 'Entregas de webhook fallidas (worker).'],
  ];
  for (const [name, help] of businessMetrics) {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name} ${business[name.replace('aurora_', '').replace('_total', '')] ?? 0}`);
  }

  lines.push('# HELP aurora_gateway_uptime_seconds Segundos desde el arranque del gateway.');
  lines.push('# TYPE aurora_gateway_uptime_seconds gauge');
  lines.push(`aurora_gateway_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`);

  lines.push(`# EOF ${now}`);
  return lines.join('\n') + '\n';
}

/** Express handler para GET /metrics */
function metricsHandler(_req, res) {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(renderMetrics());
}

/** Middleware: registra cada request al finalizar */
function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    const durationMs = Date.now() - startTime;
    const status = res.statusCode;
    recordRequest(req.method, getRoute(req), status, durationMs);
    if (status >= 400) {
      recordError(status >= 500 ? `HTTP_${status}` : `HTTP_${status}`);
    }
    originalEnd.apply(this, args);
  };

  next();
}

module.exports = {
  recordRequest,
  recordError,
  recordCheckout,
  recordPayment,
  recordWebhookFailure,
  reset,
  renderMetrics,
  metricsHandler,
  metricsMiddleware,
  DURATION_BUCKETS,
};
