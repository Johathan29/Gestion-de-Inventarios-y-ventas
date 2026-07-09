// ============================================================
// Identity DTOs
// ============================================================

import { z } from 'zod';

export const LoginDTO = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const RegisterDTO = z.object({
  name: z.string().min(2, 'Nombre muy corto').max(255),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  phone: z.string().optional(),
  role: z.string().optional(),
  companyId: z.string().uuid().optional(),
});

export const UpdateUserDTO = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.string().optional(),
});

export const ChangePasswordDTO = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
});

export const RefreshTokenDTO = z.object({
  refreshToken: z.string().min(1),
});

export const UserQueryDTO = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export default { LoginDTO, RegisterDTO, UpdateUserDTO, ChangePasswordDTO, RefreshTokenDTO, UserQueryDTO };
