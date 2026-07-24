// ============================================================
// Identity Controller — Express routes
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, hasPermission, rateLimiter, validate, apiResponse, asyncHandler } from '@erp/common';
import { LoginDTO, RegisterDTO, UpdateUserDTO, ChangePasswordDTO, RefreshTokenDTO, UserQueryDTO } from '../DTOs/index.js';
import { UserMapper } from '../mappers/index.js';

/**
 * Create Identity router
 */
export function createIdentityRouter({ applicationService }) {
  const router = Router();

  // Rate limiters
  const authLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
  const registerLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });

  // ================================================================
  // Public Endpoints
  // ================================================================

  /**
   * POST /api/identity/auth/login
   */
  router.post('/auth/login', authLimiter, validate(LoginDTO), asyncHandler(async (req, res) => {
    const result = await applicationService.login(req.body, req.ip);
    const dto = UserMapper.toDTO(result.user);

    res.json(apiResponse({
      message: 'Inicio de sesión exitoso',
      data: {
        user: dto,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    }));
  }));

  /**
   * POST /api/identity/auth/register
   */
  router.post('/auth/register', registerLimiter, validate(RegisterDTO), asyncHandler(async (req, res) => {
    const user = await applicationService.register(req.body);
    const dto = UserMapper.toDTO(user);

    res.status(201).json(apiResponse({
      message: 'Usuario registrado exitosamente',
      data: dto,
    }));
  }));

  /**
   * POST /api/identity/auth/refresh
   */
  router.post('/auth/refresh', validate(RefreshTokenDTO), asyncHandler(async (req, res) => {
    const result = await applicationService.refreshToken(req.body);

    res.json(apiResponse({
      message: 'Token refrescado',
      data: result,
    }));
  }));

  /**
   * POST /api/identity/auth/change-password
   */
  router.post('/auth/change-password', authenticate, validate(ChangePasswordDTO), asyncHandler(async (req, res) => {
    await applicationService.changePassword(req.user.id, req.body);

    res.json(apiResponse({ message: 'Contraseña actualizada exitosamente' }));
  }));

  /**
   * GET /api/identity/auth/me
   */
  router.get('/auth/me', authenticate, asyncHandler(async (req, res) => {
    const user = await applicationService.getUser(req.user.id);
    const dto = UserMapper.toDTO(user);

    res.json(apiResponse({ data: dto }));
  }));

  // ================================================================
  // Admin Endpoints (Users CRUD)
  // ================================================================

  /**
   * GET /api/identity/users
   */
  router.get('/users', authenticate, authorize('super_admin', 'admin'), asyncHandler(async (req, res) => {
    const query = UserQueryDTO.parse(req.query);
    const result = await applicationService.listUsers(query);

    res.json(apiResponse({
      data: UserMapper.toDTOList(result.data),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    }));
  }));

  /**
   * GET /api/identity/users/:id
   */
  router.get('/users/:id', authenticate, hasPermission('user:read'), asyncHandler(async (req, res) => {
    const user = await applicationService.getUser(req.params.id);
    const dto = UserMapper.toDTO(user);

    res.json(apiResponse({ data: dto }));
  }));

  /**
   * PUT /api/identity/users/:id
   */
  router.put('/users/:id', authenticate, hasPermission('user:update'), validate(UpdateUserDTO), asyncHandler(async (req, res) => {
    const user = await applicationService.updateUser(req.params.id, req.body);
    const dto = UserMapper.toDTO(user);

    res.json(apiResponse({
      message: 'Usuario actualizado',
      data: dto,
    }));
  }));

  /**
   * DELETE /api/identity/users/:id (soft delete)
   */
  router.delete('/users/:id', authenticate, hasPermission('user:delete'), asyncHandler(async (req, res) => {
    await applicationService.updateUser(req.params.id, { isActive: false });

    res.json(apiResponse({ message: 'Usuario desactivado' }));
  }));

  /**
   * PUT /api/identity/users/:id/toggle-active
   */
  router.put('/users/:id/toggle-active', authenticate, hasPermission('user:update'), asyncHandler(async (req, res) => {
    const user = await applicationService.toggleActive(req.params.id);
    const dto = UserMapper.toDTO(user);

    res.json(apiResponse({ data: dto }));
  }));

  /**
   * PUT /api/identity/users/:id/role
   */
  router.put('/users/:id/role', authenticate, hasPermission('user:update'), asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json(apiResponse({ success: false, message: 'Role es requerido' }));
    }
    const user = await applicationService.changeRole(req.params.id, role);
    const dto = UserMapper.toDTO(user);

    res.json(apiResponse({ message: 'Rol actualizado', data: dto }));
  }));

  /**
   * GET /api/identity/users/:id/access-history
   */
  router.get('/users/:id/access-history', authenticate, hasPermission('user:read'), asyncHandler(async (req, res) => {
    const history = await applicationService.getAccessHistory(req.params.id);

    res.json(apiResponse({ data: history }));
  }));

  return router;
}

export default createIdentityRouter;
