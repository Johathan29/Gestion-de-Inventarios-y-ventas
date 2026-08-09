# Implementation Plan: ERP Rearquitetura

## Overview

| Item | Detail |
|------|--------|
| Total Duration | 16 semanas (4 meses) |
| Team Size | 2-3 developers |
| Approach | Incremental, migración por bounded context |
| Strategy | Strangler Fig Pattern (migración gradual) |

## Phase 1: Foundation (Semanas 1-3)

### Semana 1-2: Database & Infrastructure
- [ ] Aplicar migraciones 027-030 en Supabase
- [ ] Verificar triggers y funciones funcionando
- [ ] Verificar RLS policies con queries de prueba
- [ ] Consolidar `@erp/shared-kernel` + `@erp/common` + `@erp/event-bus`
- [ ] Eliminar dependencias de `@inventory/shared` (migrar a ESM)
- [ ] Configurar Redis para caché y sesiones

### Semana 3: Unified Auth Service
- [ ] Consolidar auth-service + identity-service → identity-service
- [ ] Implementar refresh token rotation
- [ ] JWT con claims completos (role, company_id, permissions)
- [ ] RBAC + ABAC middleware
- [ ] Rate limiting por IP y por usuario
- [ ] Account lockout después de 10 intentos fallidos
- [ ] Migrar usuarios de ambos servicios legacy
- [ ] Tests: unitarios (bcrypt, JWT, RBAC) + integración (login flow)

**Deliverable:** Servicio de identidad unificado funcionando

---

## Phase 2: Core Domain (Semanas 4-7)

### Semana 4-5: Catalog Service
- [ ] Consolidar product-service + catalog-service + catalog-api → catalog-service
- [ ] CRUD completo de productos con variantes
- [ ] Categorías jerárquicas (árbol)
- [ ] Marcas
- [ ] Búsqueda full-text (PostgreSQL tsvector)
- [ ] Imágenes via Supabase Storage
- [ ] Slug generation automático
- [ ] Tests: unitarios (validación, slug) + integración (CRUD, búsqueda)

### Semana 5-6: Inventory Service
- [ ] Reescribir inventory-service sobre inventory_ledger
- [ ] Balance calculation desde ledger (no más stock table standalone)
- [ ] Entradas (PURCHASE_RECEIPT, ADJUSTMENT_POSITIVE, RETURN)
- [ ] Salidas (SALE, ADJUSTMENT_NEGATIVE, TRANSFER_OUT)
- [ ] Transferencias atómicas entre bodegas
- [ ] Sistema de reservas con timeout
- [ ] Alertas de stock bajo (cron job)
- [ ] Lotes y vencimientos
- [ ] Tests: unitarios (balance calc, reservation) + integración (transferencia atómica)

### Semana 6-7: Procurement Service
- [ ] Consolidar purchase-service + procurement-service
- [ ] Órdenes de compra con workflow
- [ ] Recepción de mercancía con goods_receipt
- [ ] Inspección de calidad
- [ ] Integración automática con inventory_ledger
- [ ] Multi-moneda con exchange rates
- [ ] Tests: unitarios (workflow) + integración (recepción → ledger)

**Deliverable:** Core de inventario y compras funcionando

---

## Phase 3: Sales & Financial (Semanas 8-11)

### Semana 8-9: Sales & POS
- [ ] Reescribir sale-service sobre nueva arquitectura
- [ ] Crear venta con cálculos backend
- [ ] State machine de ventas
- [ ] POS optimizations (barcode, quick-add)
- [ ] Sesiones de caja (open/close/movements)
- [ ] Métodos de pago múltiples
- [ ] Notas de crédito
- [ ] Tickets PDF
- [ ] Tests: unitarios (state machine, cálculos) + integración (POS flow completo)

### Semana 9-10: Invoice & Fiscal
- [ ] NCF auto-generation (trigger en DB)
- [ ] Secuencias NCF por tipo documento
- [ ] Notas de crédito y débito
- [ ] Validación NCF único
- [ ] Reportes DGII 606, 607
- [ ] PDF de factura
- [ ] Tests: unitarios (NCF generation) + integración (factura completa)

### Semana 10-11: Accounting Service
- [ ] Plan de cuentas configurable
- [ ] Asientos automáticos desde eventos
- [ ] Partida doble enforcement
- [ ] Balance de comprobación
- [ ] Balance general
- [ ] Estado de resultados
- [ ] Períodos contables
- [ ] Tests: unitarios (partida doble) + integración (auto-accounting)

**Deliverable:** Ventas, facturación y contabilidad funcionando

---

## Phase 4: Ecommerce & Notifications (Semanas 12-13)

### Semana 12: Ecommerce Service
- [ ] Tienda pública con catálogo
- [ ] Carrito persistente
- [ ] Checkout con reserva de stock
- [ ] Promociones y cupones
- [ ] Reviews de clientes
- [ ] Banners y hero slides
- [ ] Tests: unitarios (promo engine) + integración (checkout completo)

### Semana 13: Notification Service
- [ ] Cola de mensajes (notification_queue)
- [ ] Worker con retry y exponential backoff
- [ ] Plantillas por evento
- [ ] Multi-canal: email (nodemailer), WhatsApp, in-app
- [ ] Preferencias de usuario
- [ ] Tests: unitarios (template rendering) + integración (envío real)

**Deliverable:** Ecommerce y notificaciones funcionando

---

## Phase 5: Reporting & Integration (Semanas 14-15)

### Semana 14: Reporting Service
- [ ] Dashboard KPIs con caché
- [ ] Reportes de ventas, inventario, clientes, caja
- [ ] Reportes de compras y rentabilidad
- [ ] Exportación PDF, Excel, CSV
- [ ] Reportes programados (email automático)
- [ ] Tests: unitarios (cálculos KPI) + integración (exportación)

### Semana 15: Frontend Consolidation
- [ ] Actualizar API clients (parámetros, endpoints nuevos)
- [ ] Actualizar stores de Pinia
- [ ] Roles y permisos en UI (show/hide elements)
- [ ] POS optimizations
- [ ] Offline mode para POS
- [ ] Tests E2E críticos

**Deliverable:** Reporting y frontend actualizado

---

## Phase 6: Production Readiness (Semana 16)

### Semana 16: Hardening
- [ ] Load testing (k6/Artillery)
- [ ] Security audit (OWASP ZAP)
- [ ] Monitoring setup (logs, metrics)
- [ ] Backup strategy
- [ ] Documentation final
- [ ] Deploy a staging
- [ ] UAT (User Acceptance Testing)
- [ ] Deploy a producción
- [ ] Rollback plan documentado

**Deliverable:** Sistema en producción

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | HIGH | LOW | Backup before each migration, rollback scripts |
| Service downtime | HIGH | LOW | Strangler fig, zero-downtime migration |
| Performance regression | MEDIUM | MEDIUM | Load testing early, monitoring |
| Scope creep | HIGH | HIGH | Strict adherence to PRD, no feature additions |
| Team burnout | MEDIUM | MEDIUM | Realistic timeline, buffer weeks |

## Success Criteria

| Metric | Target |
|--------|--------|
| Zero data loss | ✅ |
| All APIs functional | ✅ |
| All tests passing | ✅ |
| RLS policies active | ✅ |
| Audit logging functional | ✅ |
| Event-driven architecture working | ✅ |
| Performance: API < 200ms p95 | ✅ |
| Security: OWASP top 10 addressed | ✅ |
