const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Listar proveedores
 */
const getSuppliers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, is_active } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: suppliers, count, error } = await query
      .range(from, to)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: suppliers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener proveedor por ID
 */
const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !supplier) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proveedor no encontrado' }
      });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear proveedor
 */
const createSupplier = async (req, res, next) => {
  try {
    const { name, contact_name, email, phone, address, city, tax_id, payment_terms, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'El nombre del proveedor es requerido' }
      });
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        name: name.trim(),
        contact_name: contact_name || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        tax_id: tax_id || null,
        payment_terms: payment_terms || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Ya existe un proveedor con ese nombre' }
        });
      }
      throw error;
    }

    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar proveedor
 */
const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contact_name, email, phone, address, city, tax_id, payment_terms, notes, is_active } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'El nombre del proveedor no puede estar vacío' }
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (contact_name !== undefined) updateData.contact_name = contact_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (tax_id !== undefined) updateData.tax_id = tax_id;
    if (payment_terms !== undefined) updateData.payment_terms = payment_terms;
    if (notes !== undefined) updateData.notes = notes;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proveedor no encontrado' }
      });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar proveedor
 */
const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar si tiene compras asociadas
    const { count: purchaseCount } = await supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', id);

    if (purchaseCount > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'HAS_RELATIONS',
          message: `No se puede eliminar: tiene ${purchaseCount} compra(s) asociada(s). Desactive el proveedor en su lugar.`
        }
      });
    }

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, data: { message: 'Proveedor eliminado correctamente' } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers, getSupplierById, createSupplier,
  updateSupplier, deleteSupplier
};
