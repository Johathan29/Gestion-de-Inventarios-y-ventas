// ============================================================
// Supabase Payments Repository Adapters
// ============================================================

import { tenantStorage } from '@erp/shared-kernel';
import { PaymentMethodMapper, CashRegisterMapper, PaymentTransactionMapper } from '../mappers/index.js';

export class SupabasePaymentMethodRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findAll(isActive = true) {
    let query = this._supabase.from('payment_methods').select('*');
    if (isActive) query = query.eq('is_active', true);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return (data || []).map(r => PaymentMethodMapper.toDomain(r));
  }

  async findByCode(code) {
    let query = this._supabase.from('payment_methods').select('*').eq('code', code);

    const { data, error } = await query.single();
    if (!error && data) return PaymentMethodMapper.toDomain(data);

    if (code === 'card') {
      const { data: fallbackData, error: fallbackError } = await this._supabase
        .from('payment_methods')
        .select('*')
        .eq('type', 'card')
        .eq('is_active', true)
        .order('name')
        .limit(1)
        .single();
      if (!fallbackError && fallbackData) return PaymentMethodMapper.toDomain(fallbackData);
    }

    return null;
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('payment_methods')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return PaymentMethodMapper.toDomain(data);
  }
}

export class SupabaseCashRegisterRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findAll({ companyId, warehouseId, status } = {}) {
    let query = this._supabase.from('cash_registers').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    if (warehouseId) query = query.eq('warehouse_id', warehouseId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return (data || []).map(r => CashRegisterMapper.toDomain(r));
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('cash_registers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return CashRegisterMapper.toDomain(data);
  }

  async save(cashRegister) {
    const persistence = CashRegisterMapper.toPersistence(cashRegister);
    const { data, error } = await this._supabase
      .from('cash_registers')
      .insert(persistence)
      .select()
      .single();
    if (error) throw error;
    return CashRegisterMapper.toDomain(data);
  }

  async update(cashRegister) {
    const persistence = CashRegisterMapper.toPersistence(cashRegister);
    const { error } = await this._supabase
      .from('cash_registers')
      .update(persistence)
      .eq('id', cashRegister.id);
    if (error) throw error;
    return this.findById(cashRegister.id);
  }
}

export class SupabasePaymentTransactionRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('payment_transactions')
      .select('*, payment_methods(name, type)')
      .eq('id', id)
      .single();
    if (error) return null;
    return PaymentTransactionMapper.toDomain(data);
  }

  async findBySale(saleId) {
    const { data, error } = await this._supabase
      .from('payment_transactions')
      .select('*, payment_methods(name, type)')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => PaymentTransactionMapper.toDomain(r));
  }

  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    const { data, error } = await this._supabase
      .from('payment_transactions')
      .select('*, payment_methods(name, type)')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (error) return null;
    return PaymentTransactionMapper.toDomain(data);
  }

  async save(transaction) {
    const persistence = PaymentTransactionMapper.toPersistence(transaction);
    const { data, error } = await this._supabase
      .from('payment_transactions')
      .insert(persistence)
      .select()
      .single();
    if (error) throw error;
    return PaymentTransactionMapper.toDomain(data);
  }

  async update(transaction) {
    const persistence = PaymentTransactionMapper.toPersistence(transaction);
    delete persistence.reference_type;
    delete persistence.reference_id;
    const { data, error } = await this._supabase
      .from('payment_transactions')
      .update(persistence)
      .eq('id', transaction.id)
      .select()
      .single();
    if (error) throw error;
    return PaymentTransactionMapper.toDomain(data);
  }

  async updateStatus(id, status) {
    const { error } = await this._supabase
      .from('payment_transactions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  }

  async findByGatewayTransactionId(gatewayTransactionId) {
    if (!gatewayTransactionId) return null;
    const { data, error } = await this._supabase
      .from('payment_transactions')
      .select('*, payment_methods(name, type)')
      .eq('gateway_transaction_id', gatewayTransactionId)
      .maybeSingle();
    if (error) return null;
    return PaymentTransactionMapper.toDomain(data);
  }

  // ─── Webhook dedup (idempotencia + replay protection) ───

  async findWebhookEvent(eventId) {
    if (!eventId) return null;
    const { data, error } = await this._supabase
      .from('payment_webhook_events')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle();
    if (error) return null;
    return data || null;
  }

  async saveWebhookEvent({ eventId, eventType, transactionId, payload }) {
    const { error } = await this._supabase
      .from('payment_webhook_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        transaction_id: transactionId || null,
        payload: payload || {},
      });
    if (error) throw error;
  }
}
