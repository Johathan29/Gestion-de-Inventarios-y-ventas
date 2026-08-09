# TRD: Identity & Access Management Service

## 1. Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (3000)                     │
│              Rate Limiting / Circuit Breaker              │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              identity-service (3001)                     │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐ │
│  │  Auth    │ │  Users   │ │  Roles    │ │  Session  │ │
│  │  Handler │ │  Handler │ │  Handler  │ │  Manager  │ │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └─────┬─────┘ │
│       │             │             │              │       │
│  ┌────▼─────────────▼─────────────▼──────────────▼────┐ │
│  │              Application Layer                      │ │
│  │  ┌─────────────┐  ┌──────────────┐                 │ │
│  │  │ TokenService│  │ PasswordSvc  │                 │ │
│  │  │ (JWT mint)  │  │ (bcrypt)     │                 │ │
│  │  └─────────────┘  └──────────────┘                 │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                  │
│  ┌────────────────────▼───────────────────────────────┐ │
│  │              Infrastructure Layer                   │ │
│  │  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ PostgreSQL   │  │ Redis        │                │ │
│  │  │ (users,roles)│  │ (sessions,   │                │ │
│  │  │              │  │  blacklist)  │                │ │
│  │  └──────────────┘  └──────────────┘                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 2. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | Express.js | 4.18+ |
| Module System | ESM | - |
| Auth Library | jsonwebtoken | 9.x |
| Password | bcrypt | 5.x |
| Validation | zod | 3.x |
| Database | PostgreSQL (Supabase) | 15 |
| Cache | Redis | 7.x |
| ORM | pg (raw queries) | 8.x |

## 3. JWT Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "uuid-del-usuario",
    "email": "user@example.com",
    "role": "admin|employee|cliente",
    "company_id": "uuid-empresa",
    "permissions": ["products:read", "products:write", "sales:read"],
    "iat": 1700000000,
    "exp": 1700000900
  }
}
```

## 4. Token Configuration

| Token | Lifetime | Storage | Rotation |
|-------|----------|---------|----------|
| Access Token | 15 min | Client memory | No |
| Refresh Token | 7 days | HttpOnly cookie | Yes (each use) |

## 5. API Implementation

### POST /api/v1/auth/login

```typescript
// Request
interface LoginRequest {
  email: string;      // required, email format
  password: string;   // required, min 8 chars
}

// Response 200
interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: 900;
  user: {
    id: string;
    email: string;
    role: string;
    company_id: string;
    first_name: string;
    last_name: string;
  };
}

// Error 401
interface LoginError {
  error: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_DISABLED';
  message: string;
  retry_after?: number;  // seconds, for lockout
}
```

### POST /api/v1/auth/refresh

```typescript
// Request
interface RefreshRequest {
  refresh_token: string;
}

// Response 200
interface RefreshResponse {
  access_token: string;
  refresh_token: string;  // new rotation
  expires_in: 900;
}
```

## 6. Database Schema

```sql
-- Tablas del servicio (ya existentes + nuevas)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Cleanup job: DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '30 days';
```

## 7. Rate Limiting

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| POST /auth/login | 5 requests | 1 min | per IP |
| POST /auth/refresh | 10 requests | 1 min | per token |
| POST /auth/forgot-password | 3 requests | 5 min | per email |

## 8. Security Implementation

```typescript
// Middleware de autorización
function authorize(requiredPermissions: string[]) {
  return (req, res, next) => {
    const user = req.user;  // from JWT decode
    
    // RBAC: check role
    if (!hasRole(user.role, requiredPermissions)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    
    // ABAC: check company_id match
    if (req.params.companyId && req.params.companyId !== user.company_id) {
      return res.status(403).json({ error: 'COMPANY_MISMATCH' });
    }
    
    next();
  };
}
```

## 9. Event Publishing

| Event | Outbox | Consumers |
|-------|--------|-----------|
| UserCreated | ✅ | email-service, audit-service |
| LoginSuccess | ✅ | audit-service |
| LoginFailed | ✅ | audit-service (security) |
| RoleChanged | ✅ | audit-service |

## 10. Migration Path

1. Deploy unified service on port 3001
2. Migrate users from both legacy services
3. Update API Gateway routes to point to unified service
4. Deprecate auth-service (keep 7 days for rollback)
5. Remove auth-service
