const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { getSupabaseClient } = require('@inventory/shared');

// NOTA (Fase 3 IDOR): auth opera sobre la IDENTIDAD GLOBAL de usuarios
// (email único global). NUNCA filtrar por company_id aquí: el company_id
// es un ATRIBUTO del usuario que se propaga al JWT, no un filtro de login.
// Usar createTenantClient aquí impediría el login de usuarios de empresas
// != DEFAULT (inyecta .eq('company_id', DEFAULT)).

// Cargar variables de entorno desde el backend/.env
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

// === RATE LIMITER PARA LOGIN ===
const loginRateLimiter = {};
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const checkLoginRateLimit = (email) => {
  const record = loginRateLimiter[email];
  if (!record) return null;
  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    const elapsed = Date.now() - record.lockedAt;
    if (elapsed < LOCKOUT_DURATION_MS) {
      const remaining = Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 60000);
      return `Demasiados intentos fallidos. Intenta de nuevo en ${remaining} minuto${remaining !== 1 ? 's' : ''}.`;
    }
    delete loginRateLimiter[email];
  }
  return null;
};

const recordLoginAttempt = (email, success) => {
  if (success) {
    delete loginRateLimiter[email];
    return;
  }
  if (!loginRateLimiter[email]) {
    loginRateLimiter[email] = { attempts: 0, lockedAt: null };
  }
  loginRateLimiter[email].attempts++;
  if (loginRateLimiter[email].attempts >= MAX_LOGIN_ATTEMPTS) {
    loginRateLimiter[email].lockedAt = Date.now();
  }
};

/**
 * Inicio de sesión
 */
const login = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email y contraseña requeridos' }
      });
    }

    // Buscar usuario por email
    // Verificar rate limit antes de consultar BD
    const rateLimitMsg = checkLoginRateLimit(email.toLowerCase());
    if (rateLimitMsg) {
      return res.status(429).json({
        success: false,
        error: { code: 'TOO_MANY_ATTEMPTS', message: rateLimitMsg }
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*, roles(name, permissions)')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' }
      });
    }

    // Verificar si el usuario está activo
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: { code: 'USER_BLOCKED', message: 'Cuenta bloqueada. Contacta al administrador.' }
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      await registerLoginAttempt(supabase, user.id, false);
      recordLoginAttempt(email.toLowerCase(), false);
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' }
      });
    }

    // Limpiar rate limit al iniciar sesión exitosamente
    recordLoginAttempt(email.toLowerCase(), true);

    // Registrar intento exitoso
    await registerLoginAttempt(supabase, user.id, true);

    // Generar tokens
    const accessToken = generateAccessToken(user);
    const refreshTokenValue = generateRefreshToken(user);

    // Actualizar refresh token en BD
    await supabase
      .from('users')
      .update({ refresh_token: refreshTokenValue, last_login: new Date().toISOString() })
      .eq('id', user.id);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenValue,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.roles?.name || 'cliente',
          permissions: user.roles?.permissions || {},
          company_id: user.company_id || '00000000-0000-0000-0000-000000000001',
          company_name: user.company_name || ''
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Registro de usuario
 */
const register = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Nombre, email y contraseña requeridos' }
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email inválido' }
      });
    }

    // Validar contraseña
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'La contraseña debe tener al menos 8 caracteres' }
      });
    }

    // Verificar si el email ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'El email ya está registrado' }
      });
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Obtener role_id para 'cliente'
    const { data: roleRecord } = await supabase
      .from('roles')
      .select('id, permissions')
      .eq('name', 'cliente')
      .single();

    // Crear usuario
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        phone,
        role_id: roleRecord?.id,
        is_active: true
      })
      .select()
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

    // Generar tokens
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: 'cliente',
        permissions: roleRecord?.permissions || {},
        company_id: user.company_id || '00000000-0000-0000-0000-000000000001',
        company_name: ''
      },
      JWT_SECRET,
      { expiresIn: '15m', issuer: 'inventory-system' }
    );
    const refreshTokenValue = generateRefreshToken(user);

    await supabase
      .from('users')
      .update({ refresh_token: refreshTokenValue })
      .eq('id', user.id);

    // Enviar correo de bienvenida (no bloqueante)
    try {
      const emailServiceUrl = `http://localhost:${process.env.EMAIL_SERVICE_PORT || 3014}/api/email/registration-data`;
      fetch(emailServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: 'cliente'
        })
      }).catch(err => console.log(`[Auth] Welcome email not sent: ${err.message}`));
    } catch (emailErr) {
      console.log(`[Auth] Welcome email error: ${emailErr.message}`);
    }

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenValue,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'cliente',
          permissions: roleRecord?.permissions || {},
          company_id: user.company_id || '00000000-0000-0000-0000-000000000001',
          company_name: ''
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Renovar token
 */
const refreshToken = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Refresh token requerido' }
      });
    }

    // Verificar refresh token
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

    // Buscar usuario
    const { data: user } = await supabase
      .from('users')
      .select('*, roles(name, permissions)')
      .eq('id', decoded.sub)
      .single();

    if (!user || user.refresh_token !== token) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Refresh token inválido' }
      });
    }

    // Generar nuevos tokens
    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await supabase
      .from('users')
      .update({ refresh_token: newRefreshToken })
      .eq('id', user.id);

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Refresh token expirado' }
      });
    }
    next(error);
  }
};

/**
 * Cerrar sesión
 */
const logout = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('users')
      .update({ refresh_token: null })
      .eq('id', req.user.id);

    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Solicitar recuperación de contraseña
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email requerido' }
      });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    // Siempre responder igual por seguridad
    res.json({
      success: true,
      message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña'
    });

    if (user) {
      const resetToken = jwt.sign(
        { sub: user.id, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      await supabase
        .from('users')
        .update({ reset_password_token: resetToken, reset_password_expires: new Date(Date.now() + 3600000).toISOString() })
        .eq('id', user.id);

      // Enviar email de recuperación usando Mailtrap
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      const emailServicePort = process.env.EMAIL_SERVICE_PORT || 3014;

      try {
        await fetch(`http://localhost:${emailServicePort}/api/email/password-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: user.name || 'Usuario',
            resetUrl
          })
        });
        console.log(`[PasswordReset] Correo enviado a ${email}`);
      } catch (emailError) {
        console.log(`[PasswordReset] Email no enviado a ${email}: ${emailError.message}`);
        console.log(`[PasswordReset] Token generado para ${email} (no se expone en logs) — reintentar envío`);
      }
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Restablecer contraseña
 */
const resetPassword = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Token y nueva contraseña requeridos' }
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'La contraseña debe tener al menos 8 caracteres' }
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', decoded.sub)
      .eq('reset_password_token', token)
      .single();

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Token inválido o expirado' }
      });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await supabase
      .from('users')
      .update({ password_hash: hashedPassword, reset_password_token: null, reset_password_expires: null })
      .eq('id', user.id);

    res.json({ success: true, message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Verificar contraseña del usuario actual (para operaciones sensibles)
 */
const verifyPassword = async (req, res, next) => {
  try {    const supabase = getSupabaseClient();    const { password } = req.body;
    const userId = req.user.id;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Contraseña requerida' }
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' }
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    res.json({ success: true, data: { valid: isValid } });
  } catch (error) {
    next(error);
  }
};

// Funciones auxiliares
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.roles?.name || 'cliente',
      permissions: user.roles?.permissions || {},
      company_id: user.company_id || '00000000-0000-0000-0000-000000000001',
      company_name: user.company_name || ''
    },
    JWT_SECRET,
    { expiresIn: '15m', issuer: 'inventory-system' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d', issuer: 'inventory-system' }
  );
};

const registerLoginAttempt = async (supabaseClient, userId, success) => {
  try {
    await supabaseClient.from('audit_logs').insert({
      user_id: userId,
      entity: 'auth',
      entity_id: userId,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      new_values: { success },
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al registrar intento de login:', error);
  }
};

/**
 * Obtener usuario actual desde el token JWT
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();
    // req.user lo establece el middleware authenticate()
    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, phone, avatar_url, is_active, email_verified, role_id, created_at, last_login, roles(name, permissions)')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' }
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        is_active: user.is_active,
        email_verified: user.email_verified,
        role: user.roles?.name,
        permissions: user.roles?.permissions || {},
        company_id: user.company_id || '00000000-0000-0000-0000-000000000001',
        company_name: user.company_name || '',
        created_at: user.created_at,
        last_login: user.last_login
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, refreshToken, logout, requestPasswordReset, resetPassword, getCurrentUser, verifyPassword };
