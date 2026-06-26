const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

/**
 * Listar usuarios con paginación y filtros
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from('users').select('*, roles(name, permissions)', { count: 'exact' });

    if (role) {
      query = query.eq('roles.name', role);
    }
    if (status !== undefined && status !== '') {
      query = query.eq('is_active', status === 'active');
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: users, count, error } = await query;

    if (error) throw error;

    // Mapear respuesta segura
    const safeUsers = (users || []).map(({ password_hash, refresh_token, reset_password_token, roles, ...rest }) => ({
      ...rest,
      role: roles?.name || 'cliente',
      permissions: roles?.permissions || {}
    }));

    res.json({
      success: true,
      data: safeUsers,
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
 * Obtener usuario por ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*, roles(name, permissions)')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' }
      });
    }

    // Verificar permisos: solo admin puede ver cualquier usuario
    if (req.user.role !== 'admin' && req.user.id !== user.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver este usuario' }
      });
    }

    const { password_hash, refresh_token, reset_password_token, roles, ...safeUser } = user;

    res.json({
      success: true,
      data: {
        ...safeUser,
        role: roles?.name || 'cliente',
        permissions: roles?.permissions || {}
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear usuario (Admin)
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Nombre, email y contraseña requeridos' }
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'La contraseña debe tener al menos 8 caracteres' }
      });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Resolver role_id
    const roleName = role || 'cliente';
    const { data: roleRecord } = await supabase
      .from('roles')
      .select('id, permissions')
      .eq('name', roleName)
      .single();

    if (!roleRecord) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Rol '${roleName}' no encontrado` }
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        role_id: roleRecord.id,
        phone,
        is_active: true
      })
      .select('*, roles(name, permissions)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'El email ya está registrado' }
        });
      }
      throw error;
    }

    const { password_hash, refresh_token, reset_password_token, roles, ...safeUser } = user;

    res.status(201).json({
      success: true,
      data: {
        ...safeUser,
        role: roles?.name || roleName,
        permissions: roles?.permissions || {}
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar usuario
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    // Solo el mismo usuario o admin pueden actualizar
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No tienes permiso para actualizar este usuario' }
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email.toLowerCase();

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const { password_hash, refresh_token, reset_password_token, ...safeUser } = user;

    res.json({ success: true, data: safeUser });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar perfil propio (usuario autenticado)
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, phone, avatar_url } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('*, roles(name, permissions)')
      .single();

    if (error) throw error;

    const { password_hash, refresh_token, reset_password_token, roles, ...safeUser } = user;

    res.json({
      success: true,
      data: {
        ...safeUser,
        role: roles?.name || 'cliente',
        permissions: roles?.permissions || {}
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar usuario (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Cambiar rol de usuario (Admin)
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'supervisor', 'cajero', 'inventario', 'cliente'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rol inválido' }
      });
    }

    // Resolver role_id desde el nombre del rol
    const { data: roleRecord } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (!roleRecord) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rol no encontrado en el sistema' }
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ role_id: roleRecord.id })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const { password_hash, refresh_token, reset_password_token, ...safeUser } = user;

    res.json({ success: true, data: safeUser });
  } catch (error) {
    next(error);
  }
};

/**
 * Bloquear usuario (Admin)
 */
const blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Usuario bloqueado exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Desbloquear usuario (Admin)
 */
const unblockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Usuario desbloqueado exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Historial de acceso del usuario
 */
const getUserHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * CLIENTS (Clientes)
 * ==========================================
 */

/**
 * Listar clientes
 */
const getClients = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, is_active } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from('clients').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,document_number.ilike.%${search}%`);
    }
    if (is_active !== undefined && is_active !== '') {
      query = query.eq('is_active', is_active === 'true');
    }

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: clients, count, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: clients || [],
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, totalPages: Math.ceil(count / limit) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener cliente por ID
 */
const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!client) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' }
      });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear cliente
 */
const createClientRecord = async (req, res, next) => {
  try {
    const { name, email, phone, document_type, document_number, address, city, state, postal_code, notes } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'El nombre del cliente es requerido' }
      });
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        user_id: req.user?.id || null,
        name, email, phone, document_type, document_number,
        address, city, state, postal_code, notes,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar cliente
 */
const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: client, error } = await supabase
      .from('clients')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar cliente
 */
const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener cliente por user_id (para clientes autenticados)
 */
const getClientByUserId = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;

    // Solo permitir ver tu propio perfil o si eres admin
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver este cliente' }
      });
    }

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !client) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' }
      });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener cuenta de crédito del cliente autenticado
 */
const getCreditAccount = async (req, res, next) => {
  try {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!client) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' }
      });
    }

    const { data: account, error } = await supabase
      .from('client_credit_accounts')
      .select('*')
      .eq('client_id', client.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!account) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No tienes cuenta de crédito configurada' }
      });
    }

    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear cuenta de crédito para el cliente autenticado
 */
const createCreditAccount = async (req, res, next) => {
  try {
    const { account_number, account_type = 'credito', credit_limit = 0 } = req.body;

    if (!account_number) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Número de cuenta requerido' }
      });
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!client) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' }
      });
    }

    const { data: account, error } = await supabase
      .from('client_credit_accounts')
      .insert({
        client_id: client.id,
        account_number,
        account_type,
        credit_limit,
        current_balance: 0,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar cuenta de crédito
 */
const updateCreditAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { account_number, account_type, credit_limit } = req.body;

    const updateData = {};
    if (account_number) updateData.account_number = account_number;
    if (account_type) updateData.account_type = account_type;
    if (credit_limit !== undefined) updateData.credit_limit = credit_limit;
    updateData.updated_at = new Date().toISOString();

    const { data: account, error } = await supabase
      .from('client_credit_accounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener preferencias de notificación del cliente autenticado
 */
const getNotificationPrefs = async (req, res, next) => {
  try {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!client) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' }
      });
    }

    const { data: prefs, error } = await supabase
      .from('client_notification_preferences')
      .select('*')
      .eq('client_id', client.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!prefs) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Preferencias no configuradas' }
      });
    }

    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar preferencias de notificación
 */
const updateNotificationPrefs = async (req, res, next) => {
  try {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!client) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' }
      });
    }

    const updateData = { ...req.body, updated_at: new Date().toISOString() };

    // Upsert: insertar si no existe, actualizar si existe
    const { data: prefs, error } = await supabase
      .from('client_notification_preferences')
      .upsert({
        client_id: client.id,
        ...updateData
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers, getUserById, createUser, updateUser, updateMyProfile, deleteUser,
  updateUserRole, blockUser, unblockUser, getUserHistory,
  getClients, getClientById, createClientRecord, updateClient, deleteClient,
  getClientByUserId, getCreditAccount, createCreditAccount, updateCreditAccount,
  getNotificationPrefs, updateNotificationPrefs
};
