// ============================================================
// Payment Gateway Client (PSP) — tokenización
// ============================================================
// Abstracción sobre la pasarela de pago (Stripe, MercadoPago,
// Conekta, etc.). El frontend tokeniza la tarjeta con el SDK de
// la pasarela y envía SOLO el token; este cliente lo usa para
// cobrar. NUNCA se almacena el PAN ni el CVV.
//
// Configuración vía entorno:
//   PSP_PROVIDER  = 'stripe' | 'mercadopago' | 'conekta' | 'mock' (default)
//   PSP_API_URL   = URL base de la pasarela
//   PSP_SECRET_KEY= clave secreta del servidor (nunca expuesta al cliente)
//
// Si PSP_PROVIDER no está configurado → modo `mock` (desarrollo):
// aprueba los cobros con token y devuelve una referencia simulada.

import axios from 'axios';

const MOCK_STATUSES = {
  'tok_visa': 'approved',
  'tok_mastercard': 'approved',
  'tok_amex': 'approved',
  'tok_declined': 'declined',
  'tok_pending': 'pending',
};

export class PaymentGatewayClient {
  constructor() {
    this._provider = (process.env.PSP_PROVIDER || 'mock').toLowerCase();
    this._apiUrl = process.env.PSP_API_URL || '';
    this._secretKey = process.env.PSP_SECRET_KEY || '';
    this._logger = console;
  }

  get isConfigured() {
    return this._provider !== 'mock' && !!this._apiUrl && !!this._secretKey;
  }

  /**
   * Cobra un token. Devuelve { status: 'approved'|'declined'|'pending',
   * gatewayReference, lastFour?, message? }.
   * idempotencyKey evita cobros duplicados en reintentos.
   */
  async charge({ token, cardId, amount, currency = 'MXN', idempotencyKey, description = '' }) {
    if (!this.isConfigured) {
      return this._mockCharge({ token, amount });
    }

    const path = this._provider === 'stripe'
      ? '/v1/charges'
      : this._provider === 'mercadopago'
        ? '/v1/payments'
        : '/charges';

    const payload = this._provider === 'mercadopago'
      ? { token, transaction_amount: amount, description, installments: 1, payment_method_id: 'card', payer: {} }
      : { source: token, amount, currency, description };

    const headers = {
      Authorization: `Bearer ${this._secretKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    };

    const { data } = await axios.post(`${this._apiUrl}${path}`, payload, { headers, timeout: 15000 });

    const status = (data.status || data.status_detail || 'pending').toLowerCase();
    const normalized = status === 'approved' || status === 'succeeded' || status === 'paid'
      ? 'approved'
      : status === 'rejected' || status === 'declined' || status === 'failed'
        ? 'declined'
        : 'pending';

    return {
      status: normalized,
      gatewayReference: data.id || data.payment_id || data.reference || '',
      lastFour: data.card?.last4 || data.last_four || data.card?.last_four || null,
      message: data.message || data.error_description || '',
    };
  }

  _mockCharge({ token, amount }) {
    const normalized = (token || '').toLowerCase();
    const status = MOCK_STATUSES[normalized] || 'approved';

    if (status === 'approved') {
      this._logger.info(`[PaymentGateway:mock] Cobro aprobado por $${amount} (token ${token || '—'})`);
      return {
        status: 'approved',
        gatewayReference: `mock_${Date.now()}`,
        lastFour: null,
        message: 'Pago aprobado (modo simulado)',
      };
    }
    if (status === 'pending') {
      this._logger.info(`[PaymentGateway:mock] Cobro pendiente por $${amount}`);
      return { status: 'pending', gatewayReference: `mock_pending_${Date.now()}`, lastFour: null, message: 'Pago pendiente' };
    }
    this._logger.warn(`[PaymentGateway:mock] Cobro rechazado por $${amount} (token ${token})`);
    return { status: 'declined', gatewayReference: '', lastFour: null, message: 'Tarjeta rechazada (modo simulado)' };
  }
}

export default PaymentGatewayClient;
