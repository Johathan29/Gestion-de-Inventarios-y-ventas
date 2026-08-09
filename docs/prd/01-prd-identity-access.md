# PRD: Identity & Access Management (IAM) Bounded Context

## 1. Overview

| Campo | Valor |
|-------|-------|
| **Bounded Context** | Identity & Access Management |
| **Versión** | 2.0 |
| **Estado** | Propuesta |
| **Autor** | Arquitecto de Sistema |

## 2. Problem Statement

El sistema actual tiene **dos servicios de autenticación/identidad** superpuestos:
- `auth-service` (puerto 3001) — CommonJS, legacy
- `identity-service` (puerto 3001) — ESM, hexagonal

Esto causa conflictos de puerto, duplicación de lógica y riesgos de seguridad.

## 3. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Unificar auth + identity en un solo servicio | Un único servicio en puerto 3001 |
| G2 | JWT con claims completos (role, company_id, permissions) | Token contiene todos los claims necesarios |
| G3 | RBAC + ABAC enforcement | Todas las rutas validan permisos |
| G4 | Multi-tenant por company_id | Datos aislados entre empresas |
| G5 | Sesiones con refresh tokens | Tokens expiran en 15min, refresh en 7d |

## 4. User Stories

### US-1: Login
**Como** usuario del sistema,
**Quiero** iniciar sesión con email y contraseña,
**Para** acceder a las funcionalidades según mi rol.

**Criterios de aceptación:**
- [ ] Recibe JWT access token (15min) + refresh token (7d)
- [ ] Token contiene: sub, email, role, company_id, permissions[]
- [ ] Si credenciales incorrectas → 401 con mensaje genérico
- [ ] Si usuario bloqueado → 403 con razón
- [ ] Se registra evento de login en audit_logs

### US-2: Refresh Token
**Como** usuario con token expirado,
**Quiero** refrescar mi token sin re-hacer login,
**Para** mantener mi sesión activa.

**Criterios de aceptación:**
- [ ] Refresh token válido → nuevo access token + refresh token
- [ ] Refresh token usado una vez → invalidado (rotation)
- [ ] Refresh token expirado → 401, redirect a login
- [ ] Refresh token en blacklist → 401, redirect a login

### US-3: Gestión de Usuarios (Admin)
**Como** admin,
**Quiero** crear, editar, activar/desactivar usuarios,
**Para** gestionar el acceso al sistema.

**Criterios de aceptación:**
- [ ] Solo admin puede crear usuarios
- [ ] Al crear usuario → se envía email de bienvenida
- [ ] Al desactivar → todas sus sesiones se invalidan
- [ ] No se puede eliminar usuario con ventas asociadas
- [ ] Email debe ser único por empresa

### US-4: RBAC + ABAC
**Como** usuario autenticado,
**Quiero** que el sistema controle qué puedo ver y hacer,
**Para** que cada rol tenga acceso adecuado.

**Criterios de aceptación:**
- [ ] Roles: admin, employee, cliente
- [ ] Permisos: read, write, delete por módulo
- [ ] ABAC: company_id match, own-data rules
- [ ] Middleware de autorización en cada ruta
- [ ] Intentos no autorizados → 403 + audit log

### US-5: Gestión de Roles y Permisos
**Como** admin,
**Quiero** configurar roles y sus permisos,
**Para** personalizar el acceso por empresa.

**Criterios de aceptación:**
- [ ] CRUD de roles
- [ ] Asignación de permisos por role
- [ ] Roles del sistema no se pueden eliminar
- [ ] Cambios en roles reflejan inmediatamente en sesiones activas

## 5. API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/login` | Login | No |
| POST | `/api/v1/auth/refresh` | Refresh token | No (usa refresh token) |
| POST | `/api/v1/auth/logout` | Logout + invalidate | Yes |
| GET | `/api/v1/auth/me` | Perfil actual | Yes |
| PUT | `/api/v1/auth/password` | Cambiar contraseña | Yes |
| POST | `/api/v1/auth/forgot-password` | Recuperar contraseña | No |
| POST | `/api/v1/auth/reset-password` | Reset con código | No |
| GET | `/api/v1/users` | Listar usuarios | Admin |
| POST | `/api/v1/users` | Crear usuario | Admin |
| PUT | `/api/v1/users/:id` | Editar usuario | Admin |
| PATCH | `/api/v1/users/:id/toggle` | Activar/Desactivar | Admin |
| GET | `/api/v1/roles` | Listar roles | Auth |
| POST | `/api/v1/roles` | Crear rol | Admin |
| PUT | `/api/v1/roles/:id` | Editar rol | Admin |

## 6. Domain Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `UserCreated` | POST /users success | email-service, audit-service |
| `UserUpdated` | PUT /users/:id | audit-service |
| `UserDeactivated` | PATCH /users/:id/toggle | notification-service, audit-service |
| `RoleChanged` | PUT /users/:id (role change) | audit-service |
| `LoginSuccess` | POST /auth/login success | audit-service |
| `LoginFailed` | POST /auth/login failure | audit-service |
| `PasswordReset` | POST /auth/reset-password | email-service, audit-service |

## 7. Data Model

```sql
-- users (ya existe, se consolida)
-- roles (ya existe)
-- user_roles (ya existe, Many-to-Many)
-- permissions (ya existe)
-- role_permissions (ya existe, Many-to-Many)
-- refresh_tokens (NUEVA)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);
```

## 8. Security Requirements

- [ ] Passwords: bcrypt hash, 12 rounds
- [ ] JWT: RS256 (asymmetric) o HS256 con secreto largo
- [ ] Rate limiting: 5 intentos/min por IP
- [ ] Account lockout: 10 intentos fallidos → bloqueo 15min
- [ ] Refresh token rotation: cada uso genera nuevo token
- [ ] CORS configurado por dominio
- [ ] Helmet headers habilitados
- [ ] Audit log en cada operación de auth

## 9. Non-Functional Requirements

| Requisito | Target |
|-----------|--------|
| Latencia login | < 200ms p95 |
| Throughput auth | 100 req/s |
| Disponibilidad | 99.9% |
| Token expiry | 15min access, 7d refresh |

## 10. Migration Plan

1. **Fase 1**: Consolidar auth-service + identity-service en uno solo
2. **Fase 2**: Implementar refresh tokens y RBAC completo
3. **Fase 3**: Migrar todos los servicios al nuevo auth centralizado
4. **Fase 4**: Desactivar el servicio legacy
