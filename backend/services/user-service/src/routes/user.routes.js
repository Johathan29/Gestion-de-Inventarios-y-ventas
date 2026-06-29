const express = require('express');
const router = express.Router();
const { authenticate, authorize, hasPermission, validate, createUserSchema, updateUserSchema } = require('@inventory/shared');
const { ROLES, PERMISSIONS } = require('@inventory/shared');
const {
  getUsers, getUserById, createUser, updateUser, updateMyProfile, deleteUser,
  updateUserRole, blockUser, unblockUser, getUserHistory,
  getClients, getClientById, createClientRecord, updateClient, deleteClient,
  getClientByUserId, getCreditAccount, createCreditAccount, updateCreditAccount,
  getNotificationPrefs, updateNotificationPrefs
} = require('../controllers/user.controller');

// Proteger todas las rutas
router.use(authenticate());

// GET /api/users - Listar usuarios (Admin, Supervisor)
router.get('/', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), getUsers);

// ==========================================
// CLIENTS - Rutas específicas (antes de /:id)
// ==========================================
router.get('/clients', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), getClients);
router.post('/clients', hasPermission(PERMISSIONS.USER_CREATE), createClientRecord);
router.get('/clients/by-user/:userId', getClientByUserId);
router.get('/clients/credit-account', getCreditAccount);
router.post('/clients/credit-account', createCreditAccount);
router.put('/clients/credit-account/:id', updateCreditAccount);
router.get('/clients/notification-prefs', getNotificationPrefs);
router.put('/clients/notification-prefs', updateNotificationPrefs);
router.get('/clients/:id', getClientById);
router.put('/clients/:id', hasPermission(PERMISSIONS.USER_UPDATE), updateClient);
router.delete('/clients/:id', hasPermission(PERMISSIONS.USER_DELETE), deleteClient);

// GET /api/users/:id - Obtener usuario
router.get('/:id', getUserById);

// POST /api/users - Crear usuario (Admin)
router.post('/', hasPermission(PERMISSIONS.USER_CREATE), validate(createUserSchema), createUser);

// PUT /api/users/me/perfil - Actualizar perfil propio (sin permisos especiales)
router.put('/me/perfil', updateMyProfile);

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', hasPermission(PERMISSIONS.USER_UPDATE), validate(updateUserSchema), updateUser);

// DELETE /api/users/:id - Eliminar usuario (Admin)
router.delete('/:id', hasPermission(PERMISSIONS.USER_DELETE), deleteUser);

// PATCH /api/users/:id/role - Cambiar rol (Admin)
router.patch('/:id/role', hasPermission(PERMISSIONS.USER_MANAGE_ROLES), updateUserRole);

// POST /api/users/:id/block - Bloquear usuario (Admin)
router.post('/:id/block', hasPermission(PERMISSIONS.USER_DELETE), blockUser);

// POST /api/users/:id/unblock - Desbloquear usuario (Admin)
router.post('/:id/unblock', hasPermission(PERMISSIONS.USER_DELETE), unblockUser);

// GET /api/users/:id/history - Historial de acceso (Admin)
router.get('/:id/history', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), getUserHistory);

module.exports = { userRouter: router };
