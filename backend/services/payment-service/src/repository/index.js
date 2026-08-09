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
    const { data, error } = await this._supabase
      .from('payment_methods')
      .select('*')
      .eq('code', code)
      .single();
    if (error) return null;
    return PaymentMethodMapper.toDomain(data);
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

  async updateStatus(id, status) {
    const { error } = await this._supabase
      .from('payment_transactions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  }
}
