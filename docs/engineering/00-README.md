# 🚀 HARDENING ENTERPRISE — Documentos de Ingeniería por Fase

> **Proyecto**: ERP + Ecommerce + CRM + CMS + SaaS Builder
> **Baseline**: 54/54 PASS (2026-08-09, `scripts/test-flows/run-full-suite.mjs`)
> **Regla absoluta**: ninguna fase puede romper el baseline. Después de cada fase:
> `node scripts/test-database/schema-contract.mjs` → `node scripts/test-flows/run-full-suite.mjs` → 54/54.

## Índice de fases

| Fase | Documento | Prioridad | Estado |
|------|-----------|-----------|--------|
| 0 | [01-BASELINE-AND-ARCHITECTURE.md](./01-BASELINE-AND-ARCHITECTURE.md) | — | ✅ Baseline 54/54 |
| 1 | [02-MULTI-TENANCY.md](./02-MULTI-TENANCY.md) | P0 | ⬜ |
| 2 | [03-RLS-RBAC-SECURITY.md](./03-RLS-RBAC-SECURITY.md) | P0 | ⬜ |
| 3 | [04-TENANT-ISOLATION-IDOR.md](./04-TENANT-ISOLATION-IDOR.md) | P0 | ⬜ |
| 4 | [05-INVENTORY-CONCURRENCY.md](./05-INVENTORY-CONCURRENCY.md) | P1 | ⬜ |
| 5 | [06-IDEMPOTENCY.md](./06-IDEMPOTENCY.md) | P1 | ⬜ |
| 6 | [07-PAYMENTS.md](./07-PAYMENTS.md) | P1 | ⬜ |
| 7 | [08-INVOICING-FISCAL.md](./08-INVOICING-FISCAL.md) | P1 | ⬜ |
| 8 | [09-WEBHOOKS-INTEGRATIONS-SECURITY.md](./09-WEBHOOKS-INTEGRATIONS-SECURITY.md) | P2 | ⬜ |
| 9 | [10-OBSERVABILITY.md](./10-OBSERVABILITY.md) | P2 | ⬜ |
| 10 | [11-PERFORMANCE-DISASTER-RECOVERY.md](./11-PERFORMANCE-DISASTER-RECOVERY.md) | P3 | ⬜ |
| 11 | [12-SAAS-ENTITLEMENTS-FINAL-CERTIFICATION.md](./12-SAAS-ENTITLEMENTS-FINAL-CERTIFICATION.md) | P4 | ⬜ |

## Mapa recomendaciones → secciones

| Recomendación (Master Prompt) | Dónde se aplica |
|---|---|
| §4-8 Tenant architecture / company_id / backfill | Fase 1 (02) |
| §9-15 RLS / defensa en profundidad / RBAC | Fase 2 (03) |
| §16-17 IDOR / tenant isolation suite | Fase 3 (04) |
| §18-23 Inventory reservations / concurrencia / double reversal | Fase 4 (05) |
| §24-25 Idempotency | Fase 5 (06) |
| §26-32 Payment state machine / webhooks | Fase 6 (07) |
| §33-34 Invoice items / fiscal snapshot | Fase 7 (08) |
| §35-36 CRM idempotency | Fase 7 (08) anexo |
| §37-40 CMS / Form security | Fase 8 (09) anexo |
| §41-45 Webhook security / SSRF / dead letters | Fase 8 (09) |
| §46-54 DB/API contracts / errores / request-id / logs / health | Fase 9 (10) |
| §55-60 Performance / cache | Fase 10 (11) |
| §61-64 SaaS plans / entitlements / usage limits | Fase 11 (12) |
| §65-66 Audit log | Fase 9 (10) anexo |
| §67-70 Rate limiting / auth / secrets | Fase 2 (03) + Fase 9 (10) |
| §71-74 Suites de seguridad/concurrencia/idempotencia | Fases 3-5 |
| §75-76 Load testing / SLOs | Fase 10 (11) |
| §77-79 Disaster recovery / migration policy | Fase 10 (11) + docs/database |
| §80-84 Microservicios / eventos | Fase 10 (11) anexo |
| §85-87 Frontend UX / i18n | Fase 11 (12) anexo |
| §88-102 Checklist producción / certificación | Fase 12 (12) |

## Estructura de carpetas de entrega

```text
docs/
├── architecture/TENANT-OWNERSHIP-MATRIX.md   ← Fase 1
├── security/RBAC-MATRIX.md                    ← Fase 2
├── database/MIGRATION-POLICY.md               ← Fase 10
├── api/ERROR-CODES.md                         ← Fase 9
└── engineering/01..12-*.md                    ← Este directorio
```

## Formato de bug (obligatorio)

```markdown
## BUG-XXX — Severity P0/P1/P2
### Component / Symptom / Root Cause / Fix / Files / Migration / Tests / Result
```

## Checkpoint por fase

```bash
node scripts/test-database/schema-contract.mjs   # contrato DB
node scripts/test-security/run-security-suite.mjs # cuando exista
node scripts/test-flows/run-full-suite.mjs        # 54/54 obligatorio
git commit -m "feat(phase-N): ..."
```
