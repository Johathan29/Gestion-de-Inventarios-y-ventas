# PRD: Notification & Communication Bounded Context

## 1. Overview

| Campo | Valor |
|-------|-------|
| **Bounded Context** | Notification & Communication |
| **Versión** | 2.0 |
| **Estado** | Propuesta |

## 2. Problem Statement

El sistema actual tiene `notifications` table escrito por **3 servicios diferentes** (identity, ecommerce, notifications-service) sin coordinación. No hay cola de mensajes ni retry.

## 3. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Servicio central de notificaciones | Un solo productor y consumidor |
| G2 | Multi-canal: email, WhatsApp, push, in-app | Todos los canales soportados |
| G3 | Cola de mensajes con retry | Fallas se reintenta 3 veces |
| G4 | Plantillas configurables | Templates por evento |

## 4. API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/notifications` | Mis notificaciones | Auth |
| PATCH | `/api/v1/notifications/:id/read` | Marcar leída | Auth |
| POST | `/api/v1/notifications/send` | Enviar notificación | Admin |
| POST | `/api/v1/notifications/bulk` | Envío masivo | Admin |
| GET | `/api/v1/notifications/templates` | Ver plantillas | Admin |
| POST | `/api/v1/notifications/templates` | Crear plantilla | Admin |
| POST | `/api/v1/whatsapp/send` | Enviar WhatsApp | Auth |

## 5. Event-Driven Architecture

```
[Outbox Worker] → notification_queue → [Notification Worker]
                                            │
                                    ┌───────┼───────┐
                                    ▼       ▼       ▼
                                 Email  WhatsApp  In-App
```

### Consumers de eventos:
| Event | Action |
|-------|--------|
| `SaleCreated` | Email confirmación + WhatsApp |
| `SaleCompleted` | Email + WhatsApp |
| `LowStockDetected` | Email admin |
| `UserCreated` | Email bienvenida |
| `PurchaseReceived` | WhatsApp proveedor |
| `InvoiceCreated` | Email factura PDF |

## 6. Data Model

```sql
-- user_notifications (ya existe)
-- notification_queue (NUEVA - MIGRATION 028)
-- notification_templates (NUEVA)
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'push', 'in_app')),
  subject_template TEXT,
  body_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- email_logs (ya existe)
```

## 7. Business Rules

1. **Cola persistente** → notification_queue sobrevuelve crashes
2. **Retry 3 veces** → exponential backoff (1s, 5s, 25s)
3. **Rate limit WhatsApp** → max 100 msg/segundo
4. **Templates por empresa** → soporte multi-tenant
5. **Do Not Disturb** → respetar preferencias del usuario
