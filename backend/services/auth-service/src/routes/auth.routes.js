const express = require('express');
const router = express.Router();
const { login, register, refreshToken, logout, requestPasswordReset, resetPassword, getCurrentUser, verifyPassword } = require('../controllers/auth.controller');
const { authenticate, validate, loginSchema, registerSchema } = require('@inventory/shared');

// POST /api/auth/login - Inicio de sesión
router.post('/login', validate(loginSchema), login);

// POST /api/auth/register - Registro de usuario
router.post('/register', validate(registerSchema), register);

// POST /api/auth/refresh - Renovar token
router.post('/refresh', refreshToken);

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', authenticate(), logout);

// POST /api/auth/forgot-password - Solicitar recuperación de contraseña
router.post('/forgot-password', requestPasswordReset);

// POST /api/auth/reset-password - Restablecer contraseña
router.post('/reset-password', resetPassword);

// GET /api/auth/me - Obtener usuario actual desde el token
router.get('/me', authenticate(), getCurrentUser);

// POST /api/auth/verify-password - Verificar contraseña (operaciones sensibles)
router.post('/verify-password', authenticate(), verifyPassword);

module.exports = { authRouter: router };
