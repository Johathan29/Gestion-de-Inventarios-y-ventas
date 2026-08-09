# Security Model: Enterprise ERP System

## 1. Authentication Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Web App  │ │ POS App  │ │ Mobile   │ │ External  │  │
│  │ (Vue 3)  │ │ (Vue 3)  │ │ (PWA)    │ │ (API)     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
└───────┼─────────────┼───────────┼──────────────┼────────┘
        │             │           │              │
┌───────▼─────────────▼───────────▼──────────────▼────────┐
│                   API Gateway (3000)                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │  1. Rate Limiting (per IP)                      │    │
│  │  2. CORS Validation                             │    │
│  │  3. JWT Validation                              │    │
│  │  4. RBAC + ABAC Middleware                      │    │
│  │  5. Request Logging (correlation_id)            │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Backend Services                            │
│  Each service validates:                                 │
│  - JWT signature & expiry                                │
│  - company_id match                                      │
│  - Service-specific permissions                          │
│  - Input validation (zod schemas)                        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              PostgreSQL (Supabase)                       │
│  Row-Level Security (RLS) as last defense line           │
└─────────────────────────────────────────────────────────┘
```

## 2. Authorization Model: RBAC + ABAC

### Role Hierarchy
```
admin (full access)
├── employee (read all, write limited)
│   ├── sales_operator (sales + POS)
│   ├── warehouse_operator (inventory + warehouse)
│   └── accountant (financial data)
└── cliente (own data only)
```

### Permission Matrix

| Module | admin | employee | sales_op | warehouse_op | accountant | cliente |
|--------|-------|----------|----------|--------------|------------|---------|
| **Users** | CRUD | R | R | R | R | self |
| **Products** | CRUD | CRU | R | R | R | R |
| **Categories** | CRUD | CRU | R | R | R | R |
| **Inventory** | CRUD | CRU | R | CRUD | R | - |
| **Ledger** | R | R | - | R | R | - |
| **Sales** | CRUD | CRU | CRU | R | R | own |
| **Invoices** | CRUD | CR | R | - | CR | own |
| **Purchases** | CRUD | CRU | - | CRU | R | - |
| **Clients** | CRUD | CRU | CRU | R | R | self |
| **Accounting** | CRUD | R | - | - | CRU | - |
| **Reports** | All | Limited | Sales | Inventory | Financial | own |
| **Cash Register** | CRUD | R | CRU | - | R | - |
| **Config** | CRUD | R | - | - | - | - |
| **Audit** | R | - | - | - | - | - |

### ABAC Rules

```typescript
const abacRules = {
  // Scope: company_id must match
  companyScope: (user, resource) => 
    user.company_id === resource.company_id,
  
  // Own data: users can only see their own data
  ownData: (user, resource) => 
    resource.user_id === user.id || 
    resource.client_id === user.client_id,
  
  // Time-based: accountant can only access current + previous period
  periodAccess: (user, period) => {
    if (user.role !== 'accountant') return true;
    const currentMonth = new Date().getMonth();
    return period.month >= currentMonth - 1;
  },
  
  // IP-based: POS access only from registered IPs
  posIpAccess: (user, ip) => {
    if (user.role !== 'sales_operator') return true;
    return registeredPosIps.includes(ip);
  }
};
```

## 3. JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT",
    "kid": "key-2024-01"
  },
  "payload": {
    "sub": "a1b2c3d4-...",
    "email": "user@company.com",
    "role": "employee",
    "company_id": "x1y2z3-...",
    "permissions": [
      "products:read",
      "products:write",
      "sales:read",
      "sales:write",
      "inventory:read"
    ],
    "session_id": "s1s2s3-...",
    "iat": 1700000000,
    "exp": 1700000900,
    "iss": "erp-system"
  }
}
```

## 4. Security Headers (Helmet)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://*.supabase.co"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

## 5. Rate Limiting Strategy

| Tier | Limit | Window | Scope |
|------|-------|--------|-------|
| Global | 1000 req | 1 min | per IP |
| Auth endpoints | 5 req | 1 min | per IP |
| Search | 30 req | 1 min | per user |
| Write operations | 60 req | 1 min | per user |
| File upload | 10 req | 5 min | per user |
| Reports | 20 req | 5 min | per user |

## 6. Input Validation (Zod Schemas)

```typescript
// Example: Sale creation validation
const CreateSaleSchema = z.object({
  client_id: z.string().uuid().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().positive().max(99999),
    unit_price: z.number().positive(), // server-calculated, client value ignored
    discount: z.number().min(0).optional(),
  })).min(1).max(100),
  payments: z.array(z.object({
    method_id: z.string().uuid(),
    amount: z.number().positive(),
    reference: z.string().max(100).optional(),
  })).min(1),
  notes: z.string().max(500).optional(),
  branch_id: z.string().uuid().optional(),
});
```

## 7. Sensitive Data Handling

| Data Type | Storage | Display | Transport |
|-----------|---------|---------|-----------|
| Password | bcrypt hash | Never | Never |
| Credit Card | NOT stored | Last 4 digits only | TLS 1.3 |
| JWT Secret | Environment var | Never | - |
| API Keys | Encrypted env | Never | - |
| Tax ID (RNC) | Plain text | Masked in UI | TLS |
| Personal Data | Plain text | Role-based | TLS |

## 8. Audit Logging

```typescript
// Every state-changing operation logs:
interface AuditLog {
  id: UUID;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  table_name: string;
  record_id: string;
  old_data: JSONB;  // for updates/deletes
  new_data: JSONB;  // for creates/updates
  performed_by: UUID;  // user_id
  ip_address: INET;
  user_agent: TEXT;
  correlation_id: UUID;  // request tracing
  timestamp: TIMESTAMPTZ;
}
```

## 9. Data Isolation (Multi-Tenant)

```
Every query includes: WHERE company_id = $user_company_id
Enforced at THREE levels:
1. Application layer (middleware)
2. Service layer (repository pattern)
3. Database layer (RLS policies)
```

## 10. Security Checklist

- [x] HTTPS enforced (TLS 1.3)
- [x] CORS configured per environment
- [x] Helmet security headers
- [x] Rate limiting on all endpoints
- [x] Input validation (zod)
- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention (output encoding + CSP)
- [x] CSRF tokens for state-changing operations
- [x] Refresh token rotation
- [x] Account lockout after failed attempts
- [x] Audit logging
- [x] RLS policies on all tables
- [x] No credit card storage
- [x] Environment variables for secrets
- [ ] Penetration testing (TODO)
- [ ] OWASP ZAP scan (TODO)
