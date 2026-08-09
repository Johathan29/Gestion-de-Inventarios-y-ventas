# 🏛️ TENANT OWNERSHIP MATRIX

> Clasificación de cada tabla del sistema según su ownership.
> Fuente: `docs/DATABASE-AUDIT-COMPLETE.md` + migraciones 001-060 (schema real, no asumido).
> Fase: 1 · P0 Multi-Tenancy

## Clasificaciones

| Clase | Significado | ¿company_id? | ¿RLS tenant? |
|---|---|---|---|
| **PLATFORM** | Datos de la plataforma SaaS (multi-empresa, solo admin plataforma) | ❌ (o `is_platform` flag) | No — protegida por rol platform_admin |
| **TENANT** | Datos de negocio de UNA empresa | ✅ NOT NULL | Sí — `company_id = get_current_company_id()` |
| **SYSTEM** | Datos de infraestructura/seguridad | Según caso | No — acceso controlado por servicio |
| **GLOBAL** | Catálogos de referencia compartidos | ❌ | No |
| **USER** | Datos personales de usuario | Via parent | Sí (user_id) |

## Matriz completa (tablas reales)

### IDENTITY / AUTH
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| roles | GLOBAL | ❌ | Catálogo de roles (SERIAL PK) |
| users | SYSTEM+TENANT | ✅ | DEFAULT '0000...01' |
| user_notifications | TENANT | ✅ | user_id + company_id |
| notification_channels | TENANT | ✅ NOT NULL | |
| user_sessions | USER | ✅ (via user) | |

### CATALOG
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| products | TENANT | ✅ | (014) |
| categories | TENANT | ✅ | (014/026) |
| brands | TENANT | ✅ | (014) — verificar columna en BD |
| product_variants | TENANT | ✅ | (021/024) |
| product_types | TENANT | ✅ | (037) |
| product_type_fields | TENANT | ✅ | (037) |
| product_custom_attributes | TENANT | ✅ | (037) |

### INVENTORY
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| inventory | TENANT | ✅ | FUENTE ÚNICA de stock |
| inventory_movements | TENANT | ✅ | entry/exit/adjustment/transfer |
| inventory_ledger | TENANT | ✅ | Append-only (028) |
| inventory_fifo_layers | TENANT | ✅ | Costeo FIFO (028) |
| inventory_reservations | TENANT | ✅ | Reservas (026) |
| warehouses | TENANT | ✅ | (014) |
| lots / serials | TENANT | ✅ | (026) |

### PROCUREMENT
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| suppliers | TENANT | ✅ | |
| purchases | TENANT | ✅ | verification_status |
| purchase_items | TENANT | ✅ | verified_qty/rejected_qty |

### SALES / PAYMENTS
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| sales | TENANT | ✅ | sale_number único por tenant |
| sale_items | TENANT | ✅ | snapshot name/sku/price |
| carts | TENANT | ✅ | |
| cart_items | TENANT | ✅ | |
| clients / customers | TENANT | ✅ | clients.user_id UNIQUE |
| payment_transactions | TENANT | ✅ | idempotency_key único parcial (055) |
| sale_payments | TENANT | ✅ | (026) |
| cash_sessions / cash_movements | TENANT | ✅ | (026) |

### INVOICING / FISCAL
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| invoices | TENANT | ✅ | NCF, hotfix_003 company_id |
| invoice_items | TENANT | ⚠️ **NO EXISTE** | ⚠️ P1: crear con snapshot fiscal (Fase 7) |
| credit_notes / debit_notes | TENANT | ✅ | (026/028) |
| fiscal_document_types | GLOBAL | ❌ | Catálogo |
| payment_methods | GLOBAL | ❌ | Catálogo |
| currencies | GLOBAL | ❌ | Catálogo (045) |

### CRM
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| crm_pipelines | TENANT | ✅ | (044) |
| crm_pipeline_stages | TENANT | ✅ | |
| crm_leads | TENANT | ✅ | converted_at |
| lead_activities / lead_notes / lead_sources / crm_tasks | TENANT | ✅ | |
| customer_interactions / customer_notes / segments | TENANT | ✅ | (v2.0) |
| loyalty_programs / points | TENANT | ✅ | (v2.0) |

### CMS / SITE BUILDER
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| cms_pages | TENANT | ✅ | (034) |
| cms_page_sections | TENANT | ✅ | |
| cms_component_registry | GLOBAL | ❌ | Librería global de componentes |
| cms_component_instances | TENANT | ✅ | |
| cms_templates | GLOBAL | ✅/❌ | Plantillas: globales + por tenant |
| cms_page_versions | TENANT | ✅ | Versionado (034) ✅ |
| cms_component_versions | TENANT | ✅ | |
| themes | GLOBAL | ❌ | 5 temas built-in (036) |
| company_themes | TENANT | ✅ | Overrides por empresa |
| theme_settings | TENANT | ✅ | |
| site_headers / site_footers / site_footer_columns / site_footer_links | TENANT | ✅ | (036) |
| site_navigation_menus / items | TENANT | ✅ | |
| site_header_widgets / site_social_links | TENANT | ✅ | |

### FORMS
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| dynamic_forms | TENANT | ✅ | (035) |
| dynamic_form_fields | TENANT | ✅ | |
| dynamic_form_submissions | TENANT | ✅ | |
| dynamic_form_submission_values / files | TENANT | ✅ | |

### PROMOTIONS / COMMERCE
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| promotion_rules / actions / coupons / usage / banners | TENANT | ✅ | (037) |
| offers | TENANT | ✅ | |
| testimonials | TENANT | ✅ | (047) |
| reviews | TENANT | ✅ | |
| wishlists / wishlist_items | TENANT | ✅ | (026) |

### MEDIA / ANALYTICS
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| media_assets | TENANT | ✅ | (038) |
| custom_code_blocks | TENANT | ✅ | ⚠️ HTML/JS injection — sanitizar (Fase 8) |
| url_redirects | TENANT | ✅ | |
| page_analytics / conversion_events | TENANT | ✅ | |
| company_analytics_summary | TENANT | ✅ | |
| platform_analytics | PLATFORM | ❌ | (038) |

### INTEGRATIONS
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| webhooks | TENANT | ✅ | (046) — ⚠️ falta firma/retries (Fase 8) |
| webhook_logs | TENANT | ✅ | |
| webhook_dead_letters | TENANT | ⚠️ **NO EXISTE** | ⚠️ P2: crear (Fase 8) |
| automation_rules / actions / logs | TENANT | ✅ | (046/056 fix uuid) |
| integration_configs / integration_logs | TENANT | ✅ | |

### SAAS PLATFORM
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| companies | PLATFORM | ❌ (es la raíz) | slug único, plan, max_users, max_products |
| plans | PLATFORM | ❌ | (042/050) |
| subscriptions | PLATFORM | ❌ | (042/050) |
| company_features | PLATFORM | ❌ | Feature flags (050) |
| usage_limits / usage_metrics | PLATFORM | ⚠️ | Entitlements (Fase 11) |
| widgets / dashboard_widgets | TENANT | ✅ | (043) |
| support_sessions / impersonation_logs | PLATFORM | ❌ | (049) |
| platform_metrics / company_activity_log | PLATFORM | ❌ | (049) |
| business_types / business_type_modules / features / templates / themes | PLATFORM | ❌ | (033) |

### SYSTEM / INFRA
| Tabla | Clase | company_id | Notas |
|---|---|---|---|
| audit_logs | SYSTEM | ❌ | Global (entity/entity_id) |
| audit_field_changes | SYSTEM | ❌ | |
| transactional_outbox | SYSTEM | ✅ | company_id presente (028/049/055) |
| idempotency_keys | SYSTEM | ⚠️ **NO EXISTE** | ⚠️ P1: crear (Fase 5) |
| system_config | GLOBAL | ❌ | Config global |
| client_notification_preferences | USER | ❌ | Hijo de clients (parent tiene company_id) |
| ecommerce_settings | TENANT | ✅ | Singleton por empresa |

## Hallazgos (verificados contra schema real)

1. ✅ 58+ tablas TENANT con company_id — cobertura excelente.
2. ✅ Las 7 tablas sin company_id son correctas por diseño (referencia/global/hijo).
3. ⚠️ `invoice_items` NO existe → Fase 7 (snapshot fiscal).
4. ⚠️ `webhook_dead_letters` NO existe → Fase 8.
5. ⚠️ `idempotency_keys` NO existe → Fase 5 (checkout idempotente).
6. ⚠️ `brands` — verificar company_id real en BD (audit la lista como ✅ pero columnas no lo muestran).
7. ⚠️ `cms_templates` / `themes` — GLOBAL built-in + TENANT custom: definir política (clonado al crear empresa).

## Verificación automática

La suite `scripts/test-database/schema-contract.mjs` (Fase 1) verificará:
- Toda tabla TENANT tiene `company_id uuid NOT NULL` + índice + FK.
- Toda tabla TENANT tiene RLS habilitada + policy por `get_current_company_id()`.
- Sin columnas huérfanas en consultas de servicios (drift).
