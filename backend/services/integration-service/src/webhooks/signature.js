// ============================================================================
// Webhook Signature & Auth Headers
//   - HMAC-SHA256 sobre el body crudo (integridad + autenticidad)
//   - Headers según auth_type: none | bearer | basic | hmac | api_key
// ============================================================================

import crypto from 'crypto';

export function signPayload(secret, body) {
  const hmac = crypto.createHmac('sha256', String(secret || ''));
  hmac.update(Buffer.isBuffer(body) ? body : String(body ?? ''));
  return hmac.digest('hex');
}

/**
 * Construye los headers de autenticación/firma para el envío de un webhook.
 * @param {object} webhook - fila de la tabla webhooks
 * @param {string|Buffer} body - body crudo que se envía (para firmar)
 * @returns {{ headers: object, signature?: string }}
 */
export function buildAuthHeaders(webhook, body) {
  const headers = { ...(webhook.custom_headers || {}) };
  let signature = null;
  const authType = (webhook.auth_type || 'none').toLowerCase();
  const authValue = webhook.auth_value || '';
  const authHeader = webhook.auth_header || 'Authorization';

  switch (authType) {
    case 'bearer':
      headers[authHeader] = `Bearer ${authValue}`;
      break;
    case 'basic':
      headers[authHeader] = `Basic ${Buffer.from(authValue).toString('base64')}`;
      break;
    case 'api_key':
      headers[authHeader] = authValue;
      break;
    case 'hmac': {
      const timestamp = new Date().toISOString();
      // Firma HMAC-SHA256 sobre timestamp + '.' + body (anti-replay + integridad)
      const signedData = `${timestamp}.${body}`;
      signature = signPayload(authValue, signedData);
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
      headers['X-Webhook-Timestamp'] = timestamp;
      break;
    }
    case 'none':
    default:
      break;
  }

  return { headers, signature };
}
