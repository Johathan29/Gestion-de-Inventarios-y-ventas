// ============================================================
// Payments Controller — Express Routes
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, validate, asyncHandler, ROLES } from '@erp/common';
import { tenantContext } from '@erp/shared-kernel';
import { ProcessPaymentDTO, RefundPaymentDTO, OpenCashRegisterDTO, CloseCashRegisterDTO } from './DTOs/index.js';
import bcrypt from 'bcryptjs';

export function createPaymentsRouter(appService, supabase) {
  const router = Router();

  router.use(authenticate, tenantContext);

  // ==================== PAYMENT METHODS ====================

  router.get('/methods',
    asyncHandler(async (req, res) => {
      const methods = await appService.listPaymentMethods();
      res.json({ success: true, data: methods });
    })
  );

  // ==================== TRANSACTIONS ====================

  router.post('/process',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SELLER),
    validate(ProcessPaymentDTO),
    asyncHandler(async (req, res) => {
      const transaction = await appService.processPayment({
        ...req.validatedBody,
        userId: req.user.id,
      });
      res.status(201).json({ success: true, data: transaction });
    })
  );

  router.post('/refund',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(RefundPaymentDTO),
    asyncHandler(async (req, res) => {
      const transaction = await appService.refundPayment({
        ...req.validatedBody,
        userId: req.user.id,
      });
      res.json({ success: true, data: transaction });
    })
  );

  router.get('/transactions/:saleId',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const transactions = await appService.getPaymentTransactions(req.params.saleId);
      res.json({ success: true, data: transactions });
    })
  );

  // ==================== CASH REGISTERS ====================

  router.get('/registers',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const registers = await appService.listCashRegisters(req.query);
      res.json({ success: true, data: registers });
    })
  );

  router.post('/registers/open',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(OpenCashRegisterDTO),
    asyncHandler(async (req, res) => {
      const register = await appService.openCashRegister({
        ...req.validatedBody,
        userId: req.user.id,
      });
      res.status(201).json({ success: true, data: register });
    })
  );

  router.post('/registers/:id/close',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(CloseCashRegisterDTO),
    asyncHandler(async (req, res) => {
      const register = await appService.closeCashRegister({
        id: req.params.id,
        ...req.validatedBody,
        userId: req.user.id,
      });
      res.json({ success: true, data: register });
    })
  );

  // ==================== SESSIONS (cash_register_sessions) ====================

  router.get('/registers/sessions',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER),
    asyncHandler(async (req, res) => {
      const { user_id, from_date, to_date, page = 1, limit = 50, status } = req.query;

      // Count total matching records
      let countQuery = supabase
        .from('cash_register_sessions')
        .select('*', { count: 'exact', head: true });

      if (user_id) countQuery = countQuery.eq('user_id', user_id);
      if (status) countQuery = countQuery.eq('status', status);
      if (from_date) countQuery = countQuery.gte('opened_at', from_date);
      if (to_date) countQuery = countQuery.lte('opened_at', to_date);

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      // Fetch page data
      let query = supabase
        .from('cash_register_sessions')
        .select('*, registers:cash_registers!register_id(id, name), users!user_id(id, name, email)');

      if (user_id) query = query.eq('user_id', user_id);
      if (status) query = query.eq('status', status);
      if (from_date) query = query.gte('opened_at', from_date);
      if (to_date) query = query.lte('opened_at', to_date);

      query = query.order('opened_at', { ascending: false });
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
        pagination: { page: Number(page), limit: Number(limit), total: count }
      });
    })
  );

  router.get('/registers/current',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER),
    asyncHandler(async (req, res) => {
      const { data, error } = await supabase
        .from('cash_register_sessions')
        .select('*, registers:cash_registers!register_id(id, name), users!user_id(id, name, email)')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      res.json({ success: true, data: data || null });
    })
  );

  router.post('/registers/sessions/open',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const { opening_balance, notes, register_id } = req.body;

      // Check if there's already an open session
      const { data: existing } = await supabase
        .from('cash_register_sessions')
        .select('id')
        .eq('status', 'open')
        .limit(1);

      if (existing && existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'SESSION_ALREADY_OPEN', message: 'Ya hay un turno abierto actualmente' }
        });
      }

      // Resolve register_id: if not provided, get or create default register
      let resolvedRegisterId = register_id;
      if (!resolvedRegisterId) {
        const { data: existingRegisters } = await supabase
          .from('cash_registers')
          .select('id')
          .limit(1);
        if (existingRegisters && existingRegisters.length > 0) {
          resolvedRegisterId = existingRegisters[0].id;
        } else {
          const { data: newRegister, error: createError } = await supabase
            .from('cash_registers')
            .insert({ name: 'Caja Principal', code: 'CAJA-001' })
            .select('id')
            .single();
          if (createError) throw createError;
          resolvedRegisterId = newRegister.id;
        }
      }

      const { data, error } = await supabase
        .from('cash_register_sessions')
        .insert({
          register_id: resolvedRegisterId,
          user_id: req.user.id,
          opening_balance: opening_balance || 0,
          notes: notes || '',
          status: 'open',
          opened_at: new Date().toISOString()
        })
        .select('*, registers:cash_registers!register_id(id, name), users!user_id(id, name, email)')
        .single();

      if (error) throw error;
      res.status(201).json({ success: true, data });
    })
  );

  router.post('/registers/sessions/:id/close',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const { closing_balance, notes } = req.body;
      const { id } = req.params;

      // Get the session
      const { data: session, error: fetchError } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !session) {
        return res.status(404).json({
          success: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Turno no encontrado' }
        });
      }

      // Calculate expected balance based on sales during this session period
      const { data: salesData } = await supabase
        .from('sales')
        .select('total')
        .gte('created_at', session.opened_at)
        .lte('created_at', new Date().toISOString());

      const salesTotal = (salesData || []).reduce((sum, s) => sum + Number(s.total || 0), 0);
      const expected_balance = Number(session.opening_balance || 0) + salesTotal;
      const difference = Number(closing_balance || 0) - expected_balance;

      const { data, error } = await supabase
        .from('cash_register_sessions')
        .update({
          closing_balance,
          expected_balance,
          difference,
          closed_at: new Date().toISOString(),
          status: 'closed',
          notes: notes || session.notes
        })
        .eq('id', id)
        .select('*, registers:cash_registers!register_id(id, name), users!user_id(id, name, email)')
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    })
  );

  // ==================== MOVEMENTS ====================

  router.get('/registers/sessions/:id/movements',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ success: true, data: data || [] });
    })
  );

  router.post('/registers/movements',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER),
    asyncHandler(async (req, res) => {
      const { session_id, type, amount, payment_method, reference, description, reference_type, reference_id } = req.body;

      if (!session_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_SESSION', message: 'session_id es requerido' }
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Monto inválido' }
        });
      }

      const insertData = {
        session_id,
        type: type || 'deposit',
        amount,
        payment_method: payment_method || 'cash',
        description: description || '',
        created_by: req.user.id
      };

      if (reference_type) insertData.reference_type = reference_type;
      if (reference_id) insertData.reference_id = reference_id;

      const { data, error } = await supabase
        .from('cash_movements')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ success: true, data });
    })
  );

  router.get('/registers/summary',
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    asyncHandler(async (req, res) => {
      const { user_id, from_date, to_date } = req.query;

      let query = supabase
        .from('cash_register_sessions')
        .select('*', { count: 'exact' });

      if (user_id) query = query.eq('user_id', user_id);
      if (from_date) query = query.gte('opened_at', from_date);
      if (to_date) query = query.lte('opened_at', to_date);

      const { data, error } = await query;
      if (error) throw error;

      const total_sessions = (data || []).length;
      let total_sales_amount = 0;
      let total_difference = 0;

      // Calculate totals from sales during session periods
      for (const session of (data || [])) {
        total_difference += Number(session.difference || 0);
        const { data: salesData } = await supabase
          .from('sales')
          .select('total')
          .gte('created_at', session.opened_at)
          .lte('created_at', session.closed_at || new Date().toISOString());
        total_sales_amount += (salesData || []).reduce((sum, s) => sum + Number(s.total || 0), 0);
      }

      res.json({
        success: true,
        data: {
          total_sessions,
          total_sales: total_sales_amount,
          difference: total_difference
        }
      });
    })
  );

  // ==================== ADMIN VERIFICATION ====================

  router.post('/registers/verify-admin',
    authenticate,
    asyncHandler(async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email y contraseña requeridos' }
        });
      }

      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email, password_hash, role_id')
        .eq('email', email)
        .single();

      if (userError || !user) {
        return res.json({ success: true, data: { valid: false, message: 'Usuario no encontrado' } });
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.json({ success: true, data: { valid: false, message: 'Contraseña incorrecta' } });
      }

      // Check if user has admin or supervisor role
      const { data: role } = await supabase
        .from('roles')
        .select('name')
        .eq('id', user.role_id)
        .single();

      const isAuthorized = role && (role.name === 'admin' || role.name === 'supervisor');

      if (!isAuthorized) {
        return res.json({
          success: true,
          data: { valid: false, message: 'El usuario no tiene permisos de administrador o supervisor' }
        });
      }

      res.json({
        success: true,
        data: {
          valid: true,
          user: { id: user.id, name: user.name, email: user.email, role: role.name }
        }
      });
    })
  );

  return router;
}
