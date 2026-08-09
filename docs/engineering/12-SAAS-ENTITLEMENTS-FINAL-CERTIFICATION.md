# PHASE 11 — SAAS ENTITLEMENTS + CERTIFICACIÓN FINAL (P4)

> Documento de ingeniería 12 · Estado: ⬜ PENDIENTE

## 1. Estado actual (SaaS — bastante avanzado)

- ✅ `companies` con plan, max_users, max_products, subscription_status, trial_ends_at, grace_period_ends_at, slug, is_active (049).
- ✅ `plans` (042/050), `subscriptions` (042/050), `company_features` (050).
- ✅ platform-admin-service (3020) con 24+ endpoints: stats, companies CRUD, impersonation, plans, subscriptions.
- ✅ PlatformAdminView completo (dashboard, companies, users, impersonation logs, onboarding).
- ✅ Business types + modules + features (033) + seeds (051).
- ✅ Frontend esconde funcionalidades por permisos (UX) — falta enforcement backend de limits.
- ⚠️ Sin usage_limits / usage_metrics enforcement (users/products/orders/storage/forms/webhooks/api_requests).

## 2. Plan

### 2.1 Usage metrics
- Tablas (si no existen): `usage_metrics` (company_id, metric, period, value) o columnas en companies.
- Contadores: users, products, orders/month, storage, forms, submissions, webhooks, automations, api_requests.

### 2.2 Enforcement middleware
- `enforcePlanLimit(metric)` en gateway: consulta usage → si supera → `PLAN_LIMIT_REACHED` (429/403 con code).
- Ejemplo: plan Starter NO puede `POST /crm/pipelines` aunque el frontend lo permita.

### 2.3 Frontend (UX solamente)
- Mostrar límites y upgrades. Nunca autoridad de seguridad.

## 3. Certificación final

No declarar PRODUCTION READY hasta:

```text
FUNCTIONAL       54/54 PASS          ✅ (baseline)
SECURITY         PASS                ⬜
TENANT ISOLATION PASS (0 cross)      ⬜
RLS              PASS                ⬜
RBAC             PASS                ⬜
IDOR             PASS                ⬜
CONCURRENCY      PASS                ⬜
IDEMPOTENCY      PASS                ⬜
PAYMENTS         PASS                ⬜
INVOICING        PASS (snapshot)     ⬜
WEBHOOK SECURITY PASS                ⬜
OBSERVABILITY    PASS                ⬜
PERFORMANCE      PASS (p95 target)   ⬜
BACKUP/RESTORE   PASS (probado)      ⬜
CI/CD            PASS (gates)        ⬜
```

### Checklist producción (`docs/production/PRODUCTION-READINESS.md`)
[ ] 54/54 E2E · [ ] Tenant isolation · [ ] RLS audit · [ ] RBAC audit · [ ] IDOR tests · [ ] Concurrency · [ ] Idempotency · [ ] Payment tests · [ ] Invoice snapshot · [ ] Webhook security · [ ] SSRF · [ ] Rate limiting · [ ] Audit log · [ ] Health checks · [ ] Metrics · [ ] Structured logging · [ ] DB contracts · [ ] API contracts · [ ] Backup restore test · [ ] Load test · [ ] Secrets audit · [ ] CI/CD gates

### Reporte final
`docs/testing/ENTERPRISE-HARDENING-REPORT.md` con: Executive Summary, Baseline, Changes, Migrations, Security findings, Tenant isolation, RLS, RBAC, Concurrency, Idempotency, Payment, Invoice, Webhook, Performance, Observability, Remaining risks, Production readiness, Final score.
