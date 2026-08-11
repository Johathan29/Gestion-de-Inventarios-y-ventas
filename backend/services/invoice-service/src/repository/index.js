// ============================================================
// Supabase Invoice & Ncf Repository Adapters
// ============================================================

import { tenantStorage } from '@erp/shared-kernel';
import { InvoiceMapper, NcfSequenceMapper, FiscalDocumentTypeMapper } from '../mappers/index.js';

export class SupabaseInvoiceRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findById(id) {
    // Fetch invoice with client info
    const { data, error } = await this._supabase
      .from('invoices')
      .select('*, clients(name, email, phone, document_number)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[InvoiceRepository] findById error:', error);
      return null;
    }
    if (!data) return null;

    // Fetch items: snapshot fiscal en invoice_items (Fase 7).
    // Fallback legacy → sale_items vía sale_id (facturas pre-070).
    const { data: invItems, error: invItemsErr } = await this._supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    let rawItems = invItems;
    if (!invItemsErr && (!invItems || invItems.length === 0)) {
      const { data: saleItems, error: itemsError } = await this._supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', data.sale_id);

      if (!itemsError && saleItems) {
        rawItems = saleItems.map(si => ({
          ...si,
          invoice_id: id,
        }));
      }
    }

    if (rawItems && rawItems.length > 0) {
      // Normalizar: invoice_items usa description; el mapper espera product_name
      data.invoice_items = rawItems.map(it => ({
        ...it,
        product_name: it.description || it.product_name || '',
      }));
    }

    // Fetch sale number
    const { data: saleData } = await this._supabase
      .from('sales')
      .select('sale_number, status')
      .eq('id', data.sale_id)
      .maybeSingle();

    if (saleData) {
      data.sales = saleData;
    }

    // Map client info from join if not already set
    if (data.clients && (!data.client_name || data.client_name === '')) {
      data.client_name = data.clients.name;
      data.client_document_number = data.client_document_number || data.clients.document_number || '';
      data.client_email = data.client_email || data.clients.email || '';
      data.client_phone = data.client_phone || data.clients.phone || '';
    }

    return InvoiceMapper.toDomain(data);
  }

  async findMany({ page = 1, limit = 10, status, saleId, clientId, invoiceType, fromDate, toDate, search, sortBy, sortOrder } = {}) {
    const from = (page - 1) * limit;
    const toVal = from + limit - 1;

    // Whitelist de columnas ordenables (evita SQL injection / columnas inexistentes)
    const SORTABLE_COLUMNS = {
      invoiceNumber: 'invoice_number',
      invoice_number: 'invoice_number',
      total: 'total',
      createdAt: 'created_at',
      created_at: 'created_at',
      paidAt: 'paid_at',
      paid_at: 'paid_at',
      clientName: 'client_name',
      client_name: 'client_name',
    };
    const sortColumn = SORTABLE_COLUMNS[sortBy] || 'created_at';
    const ascending = sortOrder === 'asc';

    let query = this._supabase
      .from('invoices')
      .select('*, clients(name)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (saleId) query = query.eq('sale_id', saleId);
    if (clientId) query = query.eq('client_id', clientId);
    if (invoiceType) query = query.eq('invoice_type', invoiceType);
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);
    if (search) {
      query = query.or(`client_name.ilike.%${search}%,invoice_number.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .range(from, toVal)
      .order(sortColumn, { ascending });

    if (error) throw error;

    // Map client info from join if not already set (same as findById)
    const mapped = (data || []).map(r => {
      if (r.clients && (!r.client_name || r.client_name === '')) {
        r.client_name = r.clients.name;
        r.client_document_number = r.client_document_number || r.clients.document_number || '';
      }
      return InvoiceMapper.toDomain(r);
    });

    return {
      data: mapped,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    };
  }

  async findBySale(saleId) {
    const { data, error } = await this._supabase
      .from('invoices')
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(r => InvoiceMapper.toDomain(r));
  }

  async save(invoice) {
    const persistence = InvoiceMapper.toPersistence(invoice);
    const { data, error } = await this._supabase
      .from('invoices')
      .insert(persistence)
      .select()
      .single();

    if (error) throw error;

    // Items: No separate invoice_items table.
    // Items are fetched dynamically from sale_items via sale_id.

    return this.findById(data.id);
  }

  async update(invoice) {
    const persistence = InvoiceMapper.toPersistence(invoice);
    const { error } = await this._supabase
      .from('invoices')
      .update(persistence)
      .eq('id', invoice.id);

    if (error) throw error;
    return this.findById(invoice.id);
  }

  async updateStatus(id, status, extraFields = {}) {
    const updateData = { status, updated_at: new Date().toISOString(), ...extraFields };
    const { error } = await this._supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  }

  async getNextNumber() {
    const { data, error } = await this._supabase
      .rpc('generate_invoice_number');

    if (!error && data) return data;

    // Fallback
    const { data: lastInv } = await this._supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNum = 1;
    if (lastInv?.invoice_number) {
      const match = lastInv.invoice_number.match(/INV-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    return `INV-${String(nextNum).padStart(8, '0')}`;
  }
}

export class SupabaseNcfRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findActiveSequence(fiscalDocumentTypeId, branch = '', companyId = null) {
    let query = this._supabase
      .from('ncf_sequences')
      .select('*')
      .eq('fiscal_document_type_id', fiscalDocumentTypeId)
      .eq('branch', branch)
      .eq('is_active', true)
      .lte('valid_from', new Date().toISOString().split('T')[0])
      .gte('valid_to', new Date().toISOString().split('T')[0]);

    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query.single();
    if (error || !data) return null;
    return NcfSequenceMapper.toDomain(data);
  }

  async getNextNcf(fiscalDocumentTypeId, branch = '', companyId = null) {
    // Get the sequence and increment atomically
    const { data, error } = await this._supabase.rpc('fn_get_next_ncf', {
      p_fiscal_document_type_id: fiscalDocumentTypeId,
      p_branch: branch,
      p_company_id: companyId,
    });

    if (error) throw error;
    return data;
  }

  async listDocumentTypes() {
    const { data, error } = await this._supabase
      .from('fiscal_document_types')
      .select('*')
      .order('code');

    if (error) throw error;
    return (data || []).map(r => FiscalDocumentTypeMapper.toDomain(r));
  }

  async getDocumentTypeById(id) {
    const { data, error } = await this._supabase
      .from('fiscal_document_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return FiscalDocumentTypeMapper.toDomain(data);
  }

  async listSequences({ companyId, branch, isActive } = {}) {
    let query = this._supabase
      .from('ncf_sequences')
      .select('*, fiscal_document_types(code, name)');

    if (companyId) query = query.eq('company_id', companyId);
    if (branch !== undefined) query = query.eq('branch', branch);
    if (isActive !== undefined) query = query.eq('is_active', isActive);

    const { data, error } = await query.order('valid_from', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => NcfSequenceMapper.toDomain(r));
  }
}
