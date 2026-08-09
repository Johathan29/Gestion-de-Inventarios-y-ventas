# 🗄️ DATABASE AUDIT — COMPLETE SCHEMA INVENTORY
> Multi-Tenant ERP System (GIICV) — Supabase/PostgreSQL  
> Generated: 2026-07-24 | Source: All 37 migration files

---

## 📊 EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| **Total Tables (surviving)** | **~65** |
| **Tables with `company_id`** | **~58** |
| **Tables WITHOUT `company_id`** | **~7** (see section 9) |
| **Materialized Views** | 1 (`inventory_balances`) |
| **Views** | 2 (`vw_purchase_detail`, `vw_products_with_stock`, `company_context`) |
| **Triggers** | ~35+ |
| **Functions/Procedures** | ~30+ |
| **RLS Policies** | ~200+ |
| **Indexes** | ~100+ |
| **Dropped/Legacy Tables** | 3 (`cart`, `hero_settings`, `system_configurations`) |

---

## 1️⃣ IDENTITY / AUTH DOMAIN

### `roles` ✅ company_id: ❌
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| name | VARCHAR(50) UNIQUE | |
| description | TEXT | |
| permissions | JSONB | Default `{}` |
| created_at | TIMESTAMPTZ | |

### `users` ✅ company_id: ✅ (via 014/031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | |
| password_hash | VARCHAR(255) | |
| name | VARCHAR(255) | |
| role_id | INT → roles.id | FK |
| phone | VARCHAR(20) | |
| avatar_url | TEXT | |
| is_active | BOOLEAN | Default true |
| email_verified | BOOLEAN | Default false |
| last_login | TIMESTAMPTZ | |
| refresh_token | TEXT | |
| refresh_token_expires | TIMESTAMPTZ | |
| reset_password_token | TEXT | |
| reset_password_expires | TIMESTAMPTZ | |
| company_id | UUID → companies.id | FK, DEFAULT '0000...01' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Triggers:** `trg_auto_create_client` (AFTER INSERT), `trg_sync_client_from_user` (AFTER UPDATE), `trg_new_user_notify` (AFTER INSERT), `set_updated_at`, `set_company_id`

### `user_notifications` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID → users.id | FK |
| type | VARCHAR(50) | 'sale', 'purchase', 'inventory', 'stock', 'info', 'login' |
| title | VARCHAR(255) | |
| message | TEXT | |
| data | JSONB | |
| is_read | BOOLEAN | |
| company_id | UUID → companies.id | |
| branch_id | UUID | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Triggers:** `trg_user_notifications_updated_at`

### `notification_channels` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | NOT NULL |
| ... | | (channel config) |

---

## 2️⃣ CATALOG / PRODUCT DOMAIN

### `categories` ✅ company_id: ✅ (via 014/026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| slug | VARCHAR(255) UNIQUE | |
| description | TEXT | |
| parent_id | UUID → categories.id | Self-referencing FK |
| image_url | TEXT | |
| status | VARCHAR(20) | 'active'/'inactive' |
| sort_order | INTEGER | |
| company_id | UUID → companies.id | |
| branch_id | UUID | |
| created_by | UUID → users.id | |
| updated_by | UUID → users.id | |
| deleted_at | TIMESTAMPTZ | Soft delete |
| deleted_by | UUID → users.id | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `brands` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| slug | VARCHAR(255) UNIQUE | |
| description | TEXT | |
| logo_url | TEXT | |
| website | VARCHAR(255) | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `products` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| slug | VARCHAR(255) UNIQUE | |
| description | TEXT | |
| sku | VARCHAR(100) UNIQUE | |
| barcode | VARCHAR(100) UNIQUE | |
| category_id | UUID → categories.id | FK |
| brand | VARCHAR(255) | Legacy (also brand_id) |
| brand_id | UUID → brands.id | FK (014) |
| price | DECIMAL(12,2) | |
| compare_price | DECIMAL(12,2) | |
| cost_price | DECIMAL(12,2) | Updated by purchase trigger |
| tax_rate | DECIMAL(5,2) | |
| unit | VARCHAR(50) | Default 'unidad' |
| min_stock | INTEGER | Default 5 |
| max_stock | INTEGER | |
| images | JSONB | |
| attributes | JSONB | |
| featured | BOOLEAN | |
| status | VARCHAR(30) | 'draft'/'published'/'hidden'/'discontinued' |
| videos | TEXT[] | (014) |
| specifications | JSONB | (014) |
| tags | TEXT[] | (014) |
| seo_title | VARCHAR(255) | (014) |
| seo_description | TEXT | (014) |
| meta_keywords | TEXT | (014) |
| warranty | VARCHAR(255) | (014) |
| weight | DECIMAL(10,2) | (014) |
| weight_unit | VARCHAR(20) | (014) |
| dimensions | JSONB | (014) |
| price_min | DECIMAL(12,2) | (014) |
| price_max | DECIMAL(12,2) | (014) |
| is_catalog_only | BOOLEAN | (014) |
| available_for_sale | BOOLEAN | (014) |
| is_active | BOOLEAN | (026) |
| company_id | UUID → companies.id | (014) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) Soft delete |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Triggers:** `trg_product_create_inventory` (AFTER INSERT → creates inventory row), `set_updated_at`, `set_company_id`

### `product_variants` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID → products.id | CASCADE |
| name | VARCHAR(255) | |
| sku | VARCHAR(100) UNIQUE | |
| price | DECIMAL(12,2) | |
| compare_price | DECIMAL(12,2) | (021) |
| stock | INTEGER | Default 0 |
| attributes | JSONB | |
| images | TEXT[] | |
| is_active | BOOLEAN | |
| sort_order | INTEGER | (021) |
| metadata | JSONB | (021) |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) Soft delete |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Triggers:** `trg_product_variants_updated_at`, `trg_product_variants_touch_product`

### `product_attributes` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| type | VARCHAR(50) | 'text'/'number'/'boolean'/'select'/'multi_select'/'color'/'size' |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `product_attribute_values` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| attribute_id | UUID → product_attributes.id | CASCADE |
| product_id | UUID → products.id | CASCADE |
| value | TEXT | |
| created_at | TIMESTAMPTZ | |

### `product_relations` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID → products.id | CASCADE |
| related_product_id | UUID → products.id | CASCADE |
| relation_type | VARCHAR(20) | 'cross_sell'/'up_sell'/'related'/'alternative' |
| sort_order | INTEGER | |
| created_at | TIMESTAMPTZ | |

### `product_reviews` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID → products.id | CASCADE |
| client_name | VARCHAR(255) | |
| client_title | VARCHAR(255) | |
| client_avatar_url | TEXT | |
| rating | INTEGER | 1-5 CHECK |
| title | VARCHAR(255) | |
| comment | TEXT | |
| is_approved | BOOLEAN | |
| is_featured | BOOLEAN | |
| approved_by | UUID → users.id | |
| approved_at | TIMESTAMPTZ | |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) Soft delete |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `product_price_history` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | NOT NULL |
| ... | | (price change tracking) |

### `price_lists` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| code | VARCHAR(50) UNIQUE | |
| description | TEXT | |
| is_default | BOOLEAN | |
| is_active | BOOLEAN | |
| valid_from | TIMESTAMPTZ | |
| valid_to | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `price_list_items` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| price_list_id | UUID → price_lists.id | CASCADE |
| product_id | UUID → products.id | CASCADE |
| price | DECIMAL(12,2) | |
| min_quantity | INTEGER | Default 1 |
| created_at | TIMESTAMPTZ | |

---

## 3️⃣ INVENTORY DOMAIN

### `warehouses` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| code | VARCHAR(50) UNIQUE | |
| name | VARCHAR(255) | |
| address | TEXT | |
| city | VARCHAR(100) | |
| state | VARCHAR(100) | |
| country | VARCHAR(100) | |
| phone | VARCHAR(30) | |
| email | VARCHAR(255) | |
| is_main | BOOLEAN | |
| is_active | BOOLEAN | |
| company_id | UUID → companies.id | CASCADE (014) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `warehouse_locations` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| warehouse_id | UUID → warehouses.id | CASCADE |
| code | VARCHAR(100) | |
| name | VARCHAR(255) | |
| zone | VARCHAR(100) | |
| aisle | VARCHAR(100) | |
| shelf | VARCHAR(100) | |
| is_active | BOOLEAN | |
| company_id | UUID → companies.id | (031) |
| created_at | TIMESTAMPTZ | |

### `inventory` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID → products.id | CASCADE |
| warehouse | VARCHAR(100) | Default 'principal' |
| stock | INTEGER | Default 0 |
| min_stock | INTEGER | Default 5 |
| max_stock | INTEGER | |
| location | VARCHAR(100) | |
| supplier_id | UUID → suppliers.id | (009) |
| entry_date | TIMESTAMPTZ | (009) |
| movement_date | TIMESTAMPTZ | (009) |
| total_price | DECIMAL(12,2) | (009) |
| reserved | INTEGER | (014) |
| available | INTEGER GENERATED | (014) stock - reserved |
| lot | VARCHAR(100) | (014) |
| serial_number | VARCHAR(255) | (014) |
| expiry_date | DATE | (014) |
| avg_cost | DECIMAL(12,2) | (014) |
| last_cost | DECIMAL(12,2) | (014) |
| is_active | BOOLEAN | (014) |
| warehouse_id | UUID → warehouses.id | (014) |
| location_id | UUID → warehouse_locations.id | (014) |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| status | VARCHAR(20) | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Triggers:** `trg_inventory_movement_date` (BEFORE UPDATE), `trg_inventory_notify` (AFTER UPDATE), `trg_low_stock_notify` (AFTER UPDATE), `set_updated_at`

### `inventory_movements` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID → products.id | CASCADE |
| warehouse | VARCHAR(100) | |
| type | VARCHAR(40) | Extended CHECK: 'entry','exit','entry_purchase','exit_sale', etc. |
| quantity | INTEGER | |
| previous_stock | INTEGER | |
| new_stock | INTEGER | |
| reference_type | VARCHAR(50) | |
| reference_id | UUID | |
| reason | TEXT | |
| notes | TEXT | |
| user_id | UUID → users.id | |
| variant_id | UUID → product_variants.id | (024) |
| warehouse_from | VARCHAR(100) | (014) |
| warehouse_to | VARCHAR(100) | (014) |
| warehouse_from_id | UUID → warehouses.id | (014) |
| warehouse_to_id | UUID → warehouses.id | (014) |
| lot | VARCHAR(100) | (014) |
| serial_number | VARCHAR(255) | (014) |
| unit_cost | DECIMAL(12,2) | (014) |
| total_cost | DECIMAL(12,2) | (014) |
| is_automated | BOOLEAN | (014) |
| ip_address | VARCHAR(45) | (014) |
| warehouse_id | UUID → warehouses.id | (026) |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |

### `inventory_ledger` ✅ company_id: ✅ (via 028)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID → products.id | RESTRICT |
| variant_id | UUID → product_variants.id | |
| warehouse_id | UUID → warehouses.id | RESTRICT |
| lot_id | UUID → inventory_lots.id | |
| serial_number | VARCHAR(100) | |
| movement_type | VARCHAR(40) | Controlled CHECK: 16 types |
| quantity | NUMERIC(15,4) | |
| unit_cost | NUMERIC(15,4) | |
| total_cost | NUMERIC(15,4) GENERATED | quantity * unit_cost |
| previous_balance | NUMERIC(15,4) | Auto-calculated by trigger |
| new_balance | NUMERIC(15,4) | Auto-calculated by trigger |
| reference_type | VARCHAR(50) | |
| reference_id | UUID | |
| reason | TEXT | |
| notes | TEXT | |
| company_id | UUID → companies.id | CASCADE |
| branch_id | UUID → branches.id | |
| created_by | UUID → users.id | |
| ip_address | INET | |
| correlation_id | UUID | Cross-service tracing |
| created_at | TIMESTAMPTZ | **IMMUTABLE** |

**⚠️ APPEND-ONLY: Never UPDATE or DELETE**

**Triggers:** `calculate_balances` (BEFORE INSERT), `refresh_balances_trigger` (AFTER INSERT → refreshes materialized view)

### `inventory_balances` (MATERIALIZED VIEW) ✅
Refreshed after each INSERT into `inventory_ledger`. Shows:
- `quantity_on_hand`, `quantity_reserved`, `quantity_available`
- `average_cost`, `last_cost`, `last_movement_at`

### `inventory_lots` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | DEFAULT '0000...01' |
| product_id | UUID → products.id | CASCADE |
| lot_number | VARCHAR(100) | |
| quantity | INTEGER | |
| quantity_available | INTEGER | |
| manufacturing_date | DATE | |
| expiry_date | DATE | |
| received_date | DATE | |
| supplier_id | UUID → suppliers.id | |
| purchase_id | UUID → purchases.id | |
| unit_cost | DECIMAL(12,2) | |
| location | VARCHAR(100) | |
| status | VARCHAR(20) | 'active'/'expired'/'blocked'/'depleted' |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

### `inventory_serials` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | |
| product_id | UUID → products.id | CASCADE |
| serial_number | VARCHAR(200) UNIQUE | |
| lot_id | UUID → inventory_lots.id | |
| status | VARCHAR(20) | 'available'/'reserved'/'sold'/'blocked'/'returned'/'warranty' |
| sale_id | UUID → sales.id | |
| sale_item_id | UUID → sale_items.id | |
| client_id | UUID → clients.id | |
| purchase_id | UUID → purchases.id | |
| warranty_start | DATE | |
| warranty_end | DATE | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

### `inventory_reservations` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | |
| product_id | UUID → products.id | CASCADE |
| variant_id | UUID → product_variants.id | |
| warehouse | VARCHAR(50) | |
| quantity | INTEGER | |
| reference_type | VARCHAR(50) | 'sale'/'order'/'transfer'/'production' |
| reference_id | UUID | |
| status | VARCHAR(20) | 'active'/'fulfilled'/'cancelled'/'expired' |
| expires_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

### `inventory_fifo_layers` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | |
| product_id | UUID → products.id | CASCADE |
| variant_id | UUID → product_variants.id | |
| warehouse | VARCHAR(50) | |
| quantity | INTEGER | |
| quantity_remaining | INTEGER | |
| unit_cost | DECIMAL(15,4) | |
| purchase_id | UUID → purchases.id | |
| purchase_item_id | UUID → purchase_items.id | |
| lot_id | UUID → inventory_lots.id | |
| received_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### `branches` ✅ company_id: ✅ (via 028)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | CASCADE |
| code | VARCHAR(50) | |
| name | VARCHAR(200) | |
| address | TEXT | |
| city | VARCHAR(100) | |
| state | VARCHAR(100) | |
| country | VARCHAR(100) | Default 'DO' |
| phone | VARCHAR(30) | |
| email | VARCHAR(200) | |
| manager_name | VARCHAR(200) | |
| is_main | BOOLEAN | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

---

## 4️⃣ SALES / INVOICE DOMAIN

### `sales` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| sale_number | VARCHAR(50) UNIQUE | |
| client_id | UUID → clients.id | SET NULL |
| user_id | UUID → users.id | |
| status | VARCHAR(30) | 'pending'/'confirmed'/'preparing'/'shipped'/'delivered'/'completed'/'cancelled'/'refunded'/'partially_refunded' |
| subtotal | DECIMAL(12,2) | |
| tax | DECIMAL(12,2) | |
| discount | DECIMAL(12,2) | |
| total | DECIMAL(12,2) | |
| payment_method | VARCHAR(50) | |
| payment_status | VARCHAR(20) | 'pending'/'paid'/'refunded' |
| notes | TEXT | |
| invoice_id | UUID → invoices.id | (017) |
| source | VARCHAR(30) | 'pos'/'ecommerce'/'manual' (014) |
| checkout_session_id | UUID → checkout_sessions.id | (014) |
| confirmed_at | TIMESTAMPTZ | (014) |
| preparing_at | TIMESTAMPTZ | (014) |
| shipped_at | TIMESTAMPTZ | (014) |
| delivered_at | TIMESTAMPTZ | (014) |
| cancelled_by | UUID → users.id | (014) |
| cancelled_at | TIMESTAMPTZ | (014) |
| cancellation_reason | TEXT | (014) |
| refund_amount | DECIMAL(12,2) | (014) |
| refunded_at | TIMESTAMPTZ | (014) |
| shipping_address | TEXT | (014) |
| shipping_method | VARCHAR(100) | (014) |
| shipping_cost | DECIMAL(12,2) | (014) |
| tracking_number | VARCHAR(255) | (014) |
| coupon_code | VARCHAR(50) | (014) |
| coupon_discount | DECIMAL(12,2) | (014) |
| warehouse_id | UUID → warehouses.id | (014) |
| branch | VARCHAR(100) | (014) |
| cash_register | VARCHAR(100) | (014) |
| markup_percentage | DECIMAL(5,2) | (015) |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Triggers:** `trg_sale_notify` (AFTER INSERT), `trg_sale_cancel_revert_inventory` (AFTER UPDATE OF status), `trg_sale_created` (AFTER INSERT → outbox), `trg_sale_status_changed` (AFTER UPDATE OF status → outbox), `set_updated_at`

### `sale_items` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| sale_id | UUID → sales.id | CASCADE |
| product_id | UUID → products.id | SET NULL |
| product_name | VARCHAR(255) | |
| sku | VARCHAR(100) | |
| quantity | INTEGER | |
| unit_price | DECIMAL(12,2) | |
| discount | DECIMAL(12,2) | |
| tax | DECIMAL(12,2) | |
| total | DECIMAL(12,2) | |
| variant_id | UUID → product_variants.id | (024) |
| variant_name | VARCHAR(255) | (024) |
| variant_attributes | JSONB | (024) |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |

**Triggers:** `trg_sale_item_decrease_stock` (AFTER INSERT), `trg_validate_stock` (BEFORE INSERT)

### `sale_payments` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | NOT NULL |
| ... | | (payment tracking per sale) |

### `invoices` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_number | VARCHAR(50) UNIQUE | |
| sale_id | UUID → sales.id | |
| client_id | UUID → clients.id | |
| user_id | UUID → users.id | |
| status | VARCHAR(20) | 'issued'/'paid'/'cancelled'/'voided' |
| subtotal | DECIMAL(12,2) | |
| tax | DECIMAL(12,2) | |
| discount | DECIMAL(12,2) | |
| total | DECIMAL(12,2) | |
| notes | TEXT | |
| pdf_url | TEXT | |
| qr_code | TEXT | |
| qr_data | TEXT | |
| due_date | DATE | |
| paid_at | TIMESTAMPTZ | |
| cancelled_at | TIMESTAMPTZ | |
| ncf | VARCHAR(50) | (014) DGII fiscal number |
| ncf_sequence_id | UUID → ncf_sequences.id | (014) |
| fiscal_document_type_id | UUID → fiscal_document_types.id | (014) |
| client_document_type | VARCHAR(20) | (014) 'RNC'/'CEDULA'/'PASAPORTE' |
| client_document_number | VARCHAR(50) | (014) |
| client_name | VARCHAR(255) | (014) |
| client_address | TEXT | (014) |
| client_phone | VARCHAR(30) | (014) |
| client_email | VARCHAR(255) | (014) |
| invoice_type | VARCHAR(30) | (014) 'consumer_final'/'credit_fiscal'/etc. |
| reference_invoice_id | UUID → invoices.id | (014) |
| cancellation_reason | TEXT | (014) |
| branch | VARCHAR(100) | (014) |
| cash_register | VARCHAR(100) | (014) |
| seller_name | VARCHAR(255) | (014) |
| payment_method_name | VARCHAR(100) | (014) |
| payment_term | VARCHAR(100) | (014) |
| xml_url | TEXT | (014) |
| signature | TEXT | (014) |
| qr_code_text | TEXT | (014) |
| fiscal_registration | TEXT | (014) |
| is_electronic | BOOLEAN | (014) |
| electronic_status | VARCHAR(30) | (014) 'pending'/'sent'/'approved'/'rejected' |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Triggers:** `trg_invoice_update_sale_invoice_id` (AFTER INSERT OR UPDATE OF sale_id), `trg_invoice_clear_sale_reference` (AFTER UPDATE OF status), `trg_auto_ncf` (BEFORE INSERT)

### `credit_notes` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | DEFAULT '0000...01' |
| credit_note_number | VARCHAR(50) UNIQUE | |
| sale_id | UUID → sales.id | |
| invoice_id | UUID → invoices.id | |
| client_id | UUID → clients.id | CASCADE |
| reason | TEXT | |
| subtotal | DECIMAL(12,2) | |
| tax_amount | DECIMAL(12,2) | |
| total_amount | DECIMAL(12,2) | |
| status | VARCHAR(20) | 'issued'/'applied'/'cancelled' |
| created_by | UUID → users.id | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

### `credit_note_items` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| credit_note_id | UUID → credit_notes.id | CASCADE |
| sale_item_id | UUID → sale_items.id | |
| product_id | UUID → products.id | CASCADE |
| variant_id | UUID → product_variants.id | |
| quantity | INTEGER | |
| unit_price | DECIMAL(12,2) | |
| subtotal | DECIMAL(12,2) | |
| reason | TEXT | |
| company_id | UUID → companies.id | (031) |

### `debit_notes` ✅ company_id: ✅ (via 028)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | CASCADE |
| debit_note_number | VARCHAR(50) UNIQUE | |
| invoice_id | UUID → invoices.id | |
| sale_id | UUID → sales.id | |
| client_id | UUID → clients.id | |
| reason | TEXT | |
| subtotal | NUMERIC(15,4) | |
| tax_amount | NUMERIC(15,4) | |
| total_amount | NUMERIC(15,4) | |
| status | VARCHAR(20) | 'active'/'cancelled' |
| created_by | UUID → users.id | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

### `debit_note_items` ✅ company_id: ✅ (via 028)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| debit_note_id | UUID → debit_notes.id | CASCADE |
| sale_item_id | UUID → sale_items.id | |
| product_id | UUID → products.id | |
| variant_id | UUID → product_variants.id | |
| quantity | NUMERIC(15,4) | |
| unit_price | NUMERIC(15,4) | |
| subtotal | NUMERIC(15,4) | |
| reason | TEXT | |
| created_at | TIMESTAMPTZ | |

### `returns` ✅ company_id: ✅ (via 014/026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| return_number | VARCHAR(50) UNIQUE | |
| sale_id | UUID → sales.id | CASCADE |
| invoice_id | UUID → invoices.id | |
| client_id | UUID → clients.id | |
| reason | TEXT | |
| status | VARCHAR(30) | 'pending'/'approved'/'rejected'/'received'/'inspected'/'refunded'/'closed' |
| disposition | VARCHAR(30) | 'restock'/'discard'/'donation'/'return_to_supplier' |
| refund_amount | DECIMAL(12,2) | |
| refund_method | VARCHAR(50) | |
| notes | TEXT | |
| created_by | UUID → users.id | |
| company_id | UUID → companies.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `return_items` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| return_id | UUID → returns.id | CASCADE |
| sale_item_id | UUID → sale_items.id | |
| product_id | UUID → products.id | CASCADE |
| quantity | INTEGER | |
| unit_price | DECIMAL(12,2) | |
| reason | TEXT | |
| condition | VARCHAR(30) | 'good'/'damaged'/'defective'/'expired'/'incorrect' |
| is_restocked | BOOLEAN | |
| company_id | UUID → companies.id | (031) |
| created_at | TIMESTAMPTZ | |

### `payment_transactions` ✅ company_id: ✅ (via 028)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | CASCADE |
| reference_type | VARCHAR(50) | 'sale'/'invoice'/'purchase'/'credit_note'/'return' |
| reference_id | UUID | |
| payment_method | VARCHAR(30) | 'cash'/'credit_card'/'debit_card'/'transfer'/'mobile'/'check'/'credit'/'other' |
| amount | NUMERIC(15,4) | |
| currency_code | VARCHAR(3) → currencies.code | |
| gateway | VARCHAR(50) | 'stripe'/'paypal'/'banco' |
| gateway_transaction_id | VARCHAR(200) | |
| gateway_response | JSONB | |
| status | VARCHAR(20) | 'pending'/'completed'/'failed'/'refunded' |
| card_last_four | VARCHAR(4) | |
| card_brand | VARCHAR(20) | |
| created_by | UUID → users.id | |
| ip_address | INET | |
| created_at | TIMESTAMPTZ | |

### `currencies` ✅ company_id: ❌ (reference table)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| code | VARCHAR(3) UNIQUE | ISO 4217 |
| name | VARCHAR(100) | |
| symbol | VARCHAR(10) | |
| decimal_places | INTEGER | Default 2 |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

**Seed:** USD, DOP, EUR, COP, MXN, VES

---

## 5️⃣ PURCHASING / PROCUREMENT DOMAIN

### `suppliers` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| contact_name | VARCHAR(255) | |
| email | VARCHAR(255) | |
| phone | VARCHAR(20) | |
| address | TEXT | |
| city | VARCHAR(100) | |
| tax_id | VARCHAR(50) | |
| payment_terms | VARCHAR(100) | |
| notes | TEXT | |
| is_active | BOOLEAN | |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `purchases` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| purchase_number | VARCHAR(50) UNIQUE | |
| supplier_id | UUID → suppliers.id | |
| user_id | UUID → users.id | |
| status | VARCHAR(30) | 14-state workflow (014) |
| subtotal | DECIMAL(12,2) | |
| tax | DECIMAL(12,2) | |
| discount | DECIMAL(12,2) | |
| total | DECIMAL(12,2) | |
| notes | TEXT | |
| received_at | TIMESTAMPTZ | |
| expected_date | DATE | (014) |
| received_date | TIMESTAMPTZ | (014) |
| inspected_by | UUID → users.id | (014) |
| inspected_at | TIMESTAMPTZ | (014) |
| inspection_notes | TEXT | (014) |
| rejection_reason | TEXT | (014) |
| shipping_cost | DECIMAL(12,2) | (014) |
| shipping_tracking | VARCHAR(255) | (014) |
| shipping_carrier | VARCHAR(255) | (014) |
| ordered_by | UUID → users.id | (014) |
| approved_by | UUID → users.id | (014) |
| approved_at | TIMESTAMPTZ | (014) |
| entered_inventory_by | UUID → users.id | (014) |
| entered_inventory_at | TIMESTAMPTZ | (014) |
| cancellation_reason | TEXT | (014) |
| verification_status | VARCHAR(20) | (026) |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Triggers:** `trg_purchase_item_update_inventory` (AFTER INSERT ON purchase_items), `trg_purchase_cancel_revert_inventory` (AFTER UPDATE OF status), `trg_purchase_notify` (AFTER INSERT), `trg_purchase_created` (AFTER INSERT → outbox), `trg_purchase_status_changed` (AFTER UPDATE → outbox)

### `purchase_items` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| purchase_id | UUID → purchases.id | CASCADE |
| product_id | UUID → products.id | SET NULL |
| product_name | VARCHAR(255) | |
| sku | VARCHAR(100) | |
| quantity | INTEGER | |
| unit_price | DECIMAL(12,2) | |
| discount | DECIMAL(12,2) | |
| tax | DECIMAL(12,2) | |
| total | DECIMAL(12,2) | |
| product_image | TEXT | (010) |
| barcode | VARCHAR(100) | (010) |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |

### `goods_receipts` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| receipt_number | VARCHAR(50) UNIQUE | |
| purchase_id | UUID → purchases.id | CASCADE |
| warehouse_id | UUID → warehouses.id | |
| received_by | UUID → users.id | |
| supplier_document | VARCHAR(255) | |
| carrier_name | VARCHAR(255) | |
| tracking_number | VARCHAR(255) | |
| vehicle_plate | VARCHAR(50) | |
| notes | TEXT | |
| status | VARCHAR(30) | 'pending'/'in_progress'/'completed'/'rejected'/'partial' |
| received_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| company_id | UUID → companies.id | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `goods_receipt_items` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| goods_receipt_id | UUID → goods_receipts.id | CASCADE |
| purchase_item_id | UUID → purchase_items.id | |
| product_id | UUID → products.id | CASCADE |
| expected_quantity | INTEGER | |
| received_quantity | INTEGER | |
| accepted_quantity | INTEGER | |
| rejected_quantity | INTEGER | |
| rejection_reason | TEXT | |
| lot | VARCHAR(100) | |
| serial_number | VARCHAR(255) | |
| expiry_date | DATE | |
| unit_cost | DECIMAL(12,2) | |
| notes | TEXT | |
| company_id | UUID → companies.id | |
| created_at | TIMESTAMPTZ | |

### `quality_inspections` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| inspection_number | VARCHAR(50) UNIQUE | |
| goods_receipt_id | UUID → goods_receipts.id | CASCADE |
| purchase_id | UUID → purchases.id | |
| inspected_by | UUID → users.id | |
| inspection_date | TIMESTAMPTZ | |
| status | VARCHAR(30) | 'pending'/'in_progress'/'approved'/'rejected'/'partial' |
| result | VARCHAR(20) GENERATED | STORED |
| notes | TEXT | |
| company_id | UUID → companies.id | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `quality_inspection_items` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| quality_inspection_id | UUID → quality_inspections.id | CASCADE |
| goods_receipt_item_id | UUID → goods_receipt_items.id | |
| product_id | UUID → products.id | CASCADE |
| inspected_quantity | INTEGER | |
| accepted_quantity | INTEGER | |
| rejected_quantity | INTEGER | |
| defect_type | VARCHAR(100) | |
| defect_description | TEXT | |
| severity | VARCHAR(20) | 'minor'/'major'/'critical' |
| is_approved | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

---

## 6️⃣ CLIENT / CRM DOMAIN

### `clients` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID → users.id | SET NULL |
| name | VARCHAR(255) | |
| email | VARCHAR(255) UNIQUE | |
| phone | VARCHAR(20) | |
| document_type | VARCHAR(20) | |
| document_number | VARCHAR(50) UNIQUE | |
| address | TEXT | |
| city | VARCHAR(100) | |
| state | VARCHAR(100) | |
| postal_code | VARCHAR(20) | |
| notes | TEXT | |
| is_active | BOOLEAN | |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Triggers:** `trg_auto_create_client` (on users), `trg_sync_client_from_user` (on users UPDATE)

### `client_credit_accounts` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| client_id | UUID → clients.id | CASCADE, UNIQUE |
| account_number | TEXT | Encrypted at app level |
| account_type | VARCHAR(50) | Default 'credito' |
| credit_limit | DECIMAL(12,2) | |
| current_balance | DECIMAL(12,2) | |
| interest_rate | DECIMAL(5,2) | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `client_notification_preferences` ✅ company_id: ❌
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| client_id | UUID → clients.id | CASCADE, UNIQUE |
| email_notifications | BOOLEAN | |
| whatsapp_notifications | BOOLEAN | |
| purchase_confirmation_email | BOOLEAN | |
| purchase_confirmation_whatsapp | BOOLEAN | |
| shipping_updates_email | BOOLEAN | |
| shipping_updates_whatsapp | BOOLEAN | |
| promo_emails | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `wishlist_items` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| client_id | UUID → clients.id | CASCADE |
| product_id | UUID → products.id | CASCADE |
| variant_id | UUID → product_variants.id | CASCADE |
| notes | TEXT | |
| company_id | UUID → companies.id | (026) |
| created_at | TIMESTAMPTZ | |

---

## 7️⃣ CONFIGURATION / SYSTEM DOMAIN

### `companies` ✅ (Multi-tenant root)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| slug | VARCHAR(255) UNIQUE | |
| ruc | VARCHAR(50) UNIQUE | |
| fiscal_address | TEXT | |
| commercial_name | VARCHAR(255) | |
| phone | VARCHAR(30) | |
| email | VARCHAR(255) | |
| logo_url | TEXT | |
| website | VARCHAR(255) | |
| is_active | BOOLEAN | |
| settings | JSONB | |
| currency_code | VARCHAR | (031) |
| tax_rate | DECIMAL | (031) |
| timezone | VARCHAR | (031) |
| locale | VARCHAR | (031) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Default:** `00000000-0000-0000-0000-000000000001` → "Empresa Default"

### `system_config` ✅ company_id: ❌ (global config)
| Column | Type | Notes |
|--------|------|-------|
| key | VARCHAR | PK-like |
| value | TEXT | |
| section | VARCHAR | |
| description | TEXT | |

**Seeded:** company_name, company_nit, company_address, company_phone, iva_rate, currency_symbol

### `ecommerce_settings` ✅ company_id: ✅ (via 031, singleton per company)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Fixed: '0000...01' |
| store_name | VARCHAR(255) | |
| description | TEXT | |
| logo_url | TEXT | |
| favicon_url | TEXT | |
| contact_email | VARCHAR(255) | |
| contact_phone | VARCHAR(20) | |
| address | TEXT | |
| social_networks | JSONB | |
| seo_settings | JSONB | |
| shipping_settings | JSONB | |
| payment_settings | JSONB | |
| currency_code | VARCHAR(5) | (006) |
| currency_symbol | VARCHAR(10) | (006) |
| currency_name | VARCHAR(50) | (006) |
| country | VARCHAR(100) | (006) |
| country_code | VARCHAR(5) | (006) |
| locale | VARCHAR(10) | (006) |
| default_tax_rate_id | UUID → tax_rates.id | (006) |
| tax_included | BOOLEAN | (006) |
| phone | VARCHAR(30) | (006) |
| whatsapp_number | VARCHAR(30) | (006) |
| whatsapp_message | TEXT | (006) |
| banner_default_url | TEXT | (006) |
| banner_mobile_url | TEXT | (006) |
| is_active | BOOLEAN | (008) |
| sale_markup_percentage | DECIMAL(5,2) | (015) Default 10.00 |
| company_id | UUID → companies.id | UNIQUE per company (031) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Triggers:** `trg_ecommerce_settings_singleton_insert` (BEFORE INSERT → redirects to UPDATE)

### `tax_rates` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | |
| code | VARCHAR(20) | |
| rate | DECIMAL(5,2) | |
| country_code | VARCHAR(5) | |
| is_default | BOOLEAN | |
| is_active | BOOLEAN | |
| description | TEXT | |
| company_id | UUID → companies.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Seed:** 8 tax rates (DO/ES/CA/GB/MX/CO/US)

### `whatsapp_config` ✅ company_id: ✅ (via 031, singleton per company)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| phone_number | VARCHAR(30) | |
| api_token | TEXT | |
| api_endpoint | VARCHAR(500) | |
| welcome_message | TEXT | |
| auto_reply_enabled | BOOLEAN | |
| business_hours | JSONB | |
| is_active | BOOLEAN | |
| company_id | UUID → companies.id | UNIQUE per company (031) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `audit_logs` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID → users.id | |
| action | VARCHAR(50) | |
| entity | VARCHAR(50) | |
| entity_id | UUID | |
| old_values | JSONB | |
| new_values | JSONB | |
| ip_address | VARCHAR(45) | |
| user_agent | TEXT | |
| company_id | UUID → companies.id | (014) |
| branch | VARCHAR(100) | (014) |
| session_id | VARCHAR(255) | (014) |
| changes_detail | JSONB | (014) |
| severity | VARCHAR(20) | (014) 'info'/'warning'/'error'/'critical' |
| duration_ms | INTEGER | (014) |
| created_at | TIMESTAMPTZ | |

### `audit_field_changes` ✅ company_id: ❌
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| audit_log_id | UUID → audit_logs.id | CASCADE |
| field_name | VARCHAR(255) | |
| old_value | TEXT | |
| new_value | TEXT | |
| data_type | VARCHAR(50) | |
| created_at | TIMESTAMPTZ | |

---

## 8️⃣ CMS / ECOMMERCE DOMAIN

### `ecommerce_banners` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| title | VARCHAR(255) | |
| subtitle | TEXT | |
| image_url | TEXT | |
| link_url | TEXT | |
| sort_order | INTEGER | |
| active | BOOLEAN | |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `hero_slides` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| badge | VARCHAR(255) | |
| title_line1 | VARCHAR(255) | |
| title_line2 | VARCHAR(255) | |
| title_line2_style | VARCHAR(50) | |
| description | TEXT | |
| button1_text | VARCHAR(100) | |
| button1_url | VARCHAR(500) | |
| button2_text | VARCHAR(100) | |
| button2_url | VARCHAR(500) | |
| image_url | TEXT | |
| image_mobile_url | TEXT | |
| sort_order | INTEGER | |
| is_active | BOOLEAN | |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `floating_banners` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| title | VARCHAR(255) | |
| subtitle | TEXT | |
| image_url | TEXT | |
| link_url | VARCHAR(500) | |
| background_color | VARCHAR(50) | |
| text_color | VARCHAR(50) | |
| position | VARCHAR(20) | 'top'/'bottom' |
| is_sticky | BOOLEAN | |
| is_active | BOOLEAN | |
| start_date | TIMESTAMPTZ | |
| end_date | TIMESTAMPTZ | |
| sort_order | INTEGER | |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `offers` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID → products.id | CASCADE |
| discount_percent | DECIMAL(5,2) | |
| start_date | TIMESTAMPTZ | |
| end_date | TIMESTAMPTZ | |
| active | BOOLEAN | |
| company_id | UUID → companies.id | (026) |
| branch_id | UUID | (026) |
| created_by | UUID → users.id | (026) |
| updated_by | UUID → users.id | (026) |
| deleted_at | TIMESTAMPTZ | (026) |
| deleted_by | UUID → users.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `coupons` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | (026) |
| code | VARCHAR(50) UNIQUE | |
| description | TEXT | |
| discount_type | VARCHAR(20) | 'percentage'/'fixed_amount'/'free_shipping' |
| discount_value | DECIMAL(12,2) | |
| min_purchase_amount | DECIMAL(12,2) | |
| max_discount_amount | DECIMAL(12,2) | |
| usage_limit | INTEGER | |
| usage_count | INTEGER | |
| per_user_limit | INTEGER | |
| is_active | BOOLEAN | |
| starts_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | |
| applies_to | VARCHAR(20) | 'all'/'specific_products'/'specific_categories' |
| created_by | UUID → users.id | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

### `coupon_products` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| coupon_id | UUID → coupons.id | CASCADE |
| product_id | UUID → products.id | CASCADE |
| company_id | UUID → companies.id | (031) |

### `coupon_categories` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| coupon_id | UUID → coupons.id | CASCADE |
| category_id | UUID → categories.id | CASCADE |
| company_id | UUID → companies.id | (031) |

### `coupon_usage` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| coupon_id | UUID → coupons.id | CASCADE |
| client_id | UUID → clients.id | CASCADE |
| sale_id | UUID → sales.id | |
| discount_amount | DECIMAL(12,2) | |
| company_id | UUID → companies.id | (031) |
| used_at | TIMESTAMPTZ | |

### `promotions` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | (026) |
| name | VARCHAR(200) | |
| description | TEXT | |
| type | VARCHAR(30) | 'buy_x_get_y'/'buy_x_get_discount'/'bundle'/'volume_discount'/'free_gift'/'category_discount'/'flash_sale' |
| buy_quantity | INTEGER | |
| get_quantity | INTEGER | |
| discount_percentage | DECIMAL(5,2) | |
| discount_amount | DECIMAL(12,2) | |
| max_applications | INTEGER | |
| is_active | BOOLEAN | |
| starts_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | |
| created_by | UUID → users.id | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

### `promotion_products` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| promotion_id | UUID → promotions.id | CASCADE |
| product_id | UUID → products.id | CASCADE |
| discount_percentage | DECIMAL(5,2) | |
| company_id | UUID → companies.id | (031) |

### `checkout_sessions` ✅ company_id: ✅ (via 014/031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| session_id | VARCHAR(255) UNIQUE | |
| client_id | UUID → clients.id | |
| status | VARCHAR(30) | 7-state workflow |
| shipping_address | TEXT | |
| shipping_city | VARCHAR(100) | |
| shipping_state | VARCHAR(100) | |
| shipping_country | VARCHAR(100) | |
| shipping_zip | VARCHAR(20) | |
| shipping_phone | VARCHAR(30) | |
| shipping_email | VARCHAR(255) | |
| shipping_full_name | VARCHAR(255) | |
| shipping_method | VARCHAR(100) | |
| shipping_cost | DECIMAL(12,2) | |
| shipping_carrier | VARCHAR(100) | |
| shipping_estimated_days | INTEGER | |
| payment_method | VARCHAR(50) | |
| payment_reference | VARCHAR(255) | |
| coupon_code | VARCHAR(50) | |
| coupon_discount | DECIMAL(12,2) | |
| subtotal | DECIMAL(12,2) | |
| tax | DECIMAL(12,2) | |
| discount | DECIMAL(12,2) | |
| total | DECIMAL(12,2) | |
| notes | TEXT | |
| accepted_terms | BOOLEAN | |
| completed_at | TIMESTAMPTZ | |
| ip_address | VARCHAR(45) | |
| user_agent | TEXT | |
| company_id | UUID → companies.id | (031) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `checkout_items` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| checkout_session_id | UUID → checkout_sessions.id | CASCADE |
| product_id | UUID → products.id | CASCADE |
| product_name | VARCHAR(255) | |
| sku | VARCHAR(100) | |
| quantity | INTEGER | |
| unit_price | DECIMAL(12,2) | |
| discount | DECIMAL(12,2) | |
| tax | DECIMAL(12,2) | |
| total | DECIMAL(12,2) | |
| image_url | TEXT | |
| company_id | UUID → companies.id | (031) |
| created_at | TIMESTAMPTZ | |

### `shipping_methods` ✅ company_id: ✅ (via 014/031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| carrier | VARCHAR(100) | |
| description | TEXT | |
| price | DECIMAL(12,2) | |
| estimated_days_min | INTEGER | |
| estimated_days_max | INTEGER | |
| is_active | BOOLEAN | |
| company_id | UUID → companies.id | (031) |
| created_at | TIMESTAMPTZ | |

### `carts` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID → users.id | CASCADE |
| company_id | UUID → companies.id | (026) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `cart_items` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| cart_id | UUID → carts.id | CASCADE |
| product_id | UUID → products.id | CASCADE |
| quantity | INTEGER | |
| unit_price | DECIMAL(12,2) | |
| discount | DECIMAL(12,2) | |
| variant_id | UUID → product_variants.id | (022) |
| variant_name | VARCHAR(255) | (022) |
| variant_attributes | JSONB | (022) |
| company_id | UUID → companies.id | (026) |
| created_at | TIMESTAMPTZ | |

---

## 9️⃣ ACCOUNTING / FINANCE DOMAIN

### `account_plans` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | |
| code | VARCHAR(50) | |
| name | VARCHAR(255) | |
| type | VARCHAR(30) | 'asset'/'liability'/'equity'/'income'/'expense' |
| parent_id | UUID → account_plans.id | Self-ref FK |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `accounting_entries` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | |
| entry_number | VARCHAR(50) UNIQUE | |
| entry_date | DATE | |
| description | TEXT | |
| reference_type | VARCHAR(50) | |
| reference_id | UUID | |
| is_automated | BOOLEAN | |
| status | VARCHAR(20) | 'draft'/'posted'/'cancelled' |
| created_by | UUID → users.id | |
| posted_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `accounting_entry_items` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| accounting_entry_id | UUID → accounting_entries.id | CASCADE |
| account_plan_id | UUID → account_plans.id | CASCADE |
| debit | DECIMAL(12,2) | |
| credit | DECIMAL(12,2) | |
| description | TEXT | |
| company_id | UUID → companies.id | (031) |
| created_at | TIMESTAMPTZ | |

### `payment_methods` ✅ company_id: ❌ (reference table)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| code | VARCHAR(50) UNIQUE | |
| name | VARCHAR(255) | |
| type | VARCHAR(30) | 'cash'/'card'/'transfer'/'check'/'credit'/'wallet'/'other' |
| is_active | BOOLEAN | |
| requires_reference | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `taxpayer_info` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | |
| ruc | VARCHAR(50) UNIQUE | |
| business_name | VARCHAR(255) | |
| commercial_name | VARCHAR(255) | |
| fiscal_address | TEXT | |
| phone | VARCHAR(30) | |
| email | VARCHAR(255) | |
| economic_activity | TEXT | |
| is_active | BOOLEAN | |
| fiscal_registration_number | VARCHAR(100) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

## 🔟 FISCAL / NCF DOMAIN

### `fiscal_document_types` ✅ company_id: ❌ (reference/catalog)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| code | VARCHAR(10) UNIQUE | B01-B07, B14 |
| name | VARCHAR(255) | |
| type | VARCHAR(30) | 8 types |
| prefix | VARCHAR(5) | |
| is_active | BOOLEAN | |
| requires_identification | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

**Seed:** 8 DGII types (B01-B07, B14)

### `ncf_sequences` ✅ company_id: ✅ (via 014)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | |
| fiscal_document_type_id | UUID → fiscal_document_types.id | CASCADE |
| serie | VARCHAR(10) | |
| prefix | VARCHAR(10) | |
| current_number | INTEGER | |
| max_number | INTEGER | |
| valid_from | DATE | |
| valid_to | DATE | |
| is_active | BOOLEAN | |
| branch | VARCHAR(100) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Unique:** `(company_id, fiscal_document_type_id, serie, branch)`

---

## 1️⃣1️⃣ CASH REGISTER / POS DOMAIN

### `cash_registers` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | |
| name | VARCHAR(100) | |
| code | VARCHAR(50) | (027) |
| branch_id | UUID | |
| warehouse_id | UUID → warehouses.id | (027) |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

### `cash_register_sessions` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | |
| register_id | UUID → cash_registers.id | CASCADE |
| user_id | UUID → users.id | CASCADE |
| opening_balance | DECIMAL(12,2) | |
| closing_balance | DECIMAL(12,2) | |
| expected_balance | DECIMAL(12,2) | |
| difference | DECIMAL(12,2) | |
| opened_at | TIMESTAMPTZ | |
| closed_at | TIMESTAMPTZ | |
| notes | TEXT | |
| status | VARCHAR(20) | 'open'/'closed'/'reconciled' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `cash_movements` ✅ company_id: ✅ (via 026)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | |
| session_id | UUID → cash_register_sessions.id | CASCADE |
| type | VARCHAR(20) | 'sale'/'withdrawal'/'deposit'/'refund'/'expense'/'transfer' |
| amount | DECIMAL(12,2) | |
| payment_method | VARCHAR(20) | 'cash'/'card'/'transfer'/'credit'/'check'/'mixed' |
| reference_type | VARCHAR(50) | |
| reference_id | UUID | |
| description | TEXT | |
| created_by | UUID → users.id | |
| created_at | TIMESTAMPTZ | |

---

## 1️⃣2️⃣ EVENT / MESSAGING DOMAIN

### `transactional_outbox` ✅ company_id: ✅ (via 028)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| event_type | VARCHAR(100) | 'SaleCreated', 'PurchaseReceived', etc. |
| aggregate_type | VARCHAR(50) | 'sale'/'purchase'/'inventory'/'invoice' |
| aggregate_id | UUID | |
| payload | JSONB | |
| correlation_id | UUID | |
| caused_by_user_id | UUID → users.id | |
| company_id | UUID → companies.id | |
| status | VARCHAR(20) | 'pending'/'processing'/'published'/'failed' |
| retry_count | INTEGER | |
| max_retries | INTEGER | Default 5 |
| last_error | TEXT | |
| processed_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### `email_logs` ✅ company_id: ✅ (via 031)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID → companies.id | NOT NULL |
| ... | | (email tracking) |

---

## 🗑️ DROPPED / LEGACY TABLES

| Table | Dropped In | Replaced By |
|-------|-----------|-------------|
| `cart` | 027 | `carts` + `cart_items` (020) |
| `hero_settings` | 027 | `hero_slides` (006) |
| `system_configurations` | 027 | `system_config` (001) |

---

## 9️⃣ TABLES WITHOUT `company_id` (Potential Gaps)

| Table | Has company_id | Notes |
|-------|---------------|-------|
| `roles` | ❌ | Reference table — OK to be global |
| `system_config` | ❌ | Global config — may need per-company |
| `client_notification_preferences` | ❌ | Per-client, not per-company |
| `audit_field_changes` | ❌ | Child of audit_logs (which has it) |
| `payment_methods` | ❌ | Reference table — OK to be global |
| `fiscal_document_types` | ❌ | Reference/catalog — OK to be global |
| `currencies` | ❌ | Reference table — OK to be global |

> **Verdict:** All 7 tables without `company_id` are either reference/catalog tables or child tables whose parent has `company_id`. This is **correct by design**.

---

## 1️⃣3️⃣ COMPLETE RLS POLICIES INVENTORY

### Helper Functions
- `auth.user_id()` — Extracts user UUID from JWT
- `auth.user_role()` — Extracts role from JWT  
- `auth.company_id()` — Extracts company_id from JWT

### Tables with RLS Enabled (by domain)

**Identity:** `users`, `roles`  
**Catalog:** `products`, `categories`, `brands`, `product_variants`  
**Inventory:** `inventory`, `inventory_movements`, `inventory_ledger`, `inventory_reservations`, `inventory_lots`, `inventory_serials`, `warehouses`, `warehouse_locations`  
**Procurement:** `suppliers`, `purchases`, `purchase_items`, `goods_receipts`, `goods_receipt_items`, `quality_inspections`, `quality_inspection_items`  
**Sales:** `sales`, `sale_items`, `sale_payments`  
**Cart/Checkout:** `carts`, `cart_items`, `checkout_sessions`  
**Billing:** `invoices`, `fiscal_document_types`, `ncf_sequences`, `credit_notes`, `credit_note_items`, `debit_notes`, `debit_note_items`  
**Returns:** `returns`, `return_items`  
**Ecommerce:** `clients`, `client_credit_accounts`, `offers`, `coupons`, `promotions`, `product_reviews`, `ecommerce_settings`, `ecommerce_banners`, `hero_slides`, `floating_banners`, `tax_rates`  
**Accounting:** `account_plans`, `accounting_entries`, `accounting_entry_items`, `payment_methods`  
**Multi-tenant new:** `users`, `sale_payments`, `product_price_history`, `coupon_products`, `coupon_categories`, `coupon_usage`, `promotion_products`, `email_logs`, `accounting_entry_items`, `return_items`, `checkout_sessions`, `checkout_items`, `shipping_methods`, `ecommerce_settings`, `hero_settings`, `whatsapp_config`, `notification_channels`, `warehouse_locations`, `credit_note_items`, `fiscal_document_types`, `ncf_sequences`  
**Cash:** `cash_registers`, `cash_register_sessions` (via 900)

### RLS Strategy
- **SELECT:** admin + employee (same company)
- **INSERT:** admin + employee (same company)
- **UPDATE:** admin + employee (same company)
- **DELETE:** admin only (same company)
- **Special:** `carts`/`cart_items` → user-scoped (own cart only)
- **Special:** `clients` → user sees own, admin/employee see all
- **Special:** `fiscal_document_types` → read for all authenticated

---

## 1️⃣4️⃣ TRIGGERS SUMMARY

| Trigger | Table | Event | Purpose |
|---------|-------|-------|---------|
| `trg_auto_create_client` | users | AFTER INSERT | Auto-create client record |
| `trg_sync_client_from_user` | users | AFTER UPDATE | Sync client data from user |
| `trg_new_user_notify` | users | AFTER INSERT | Notify admins of new user |
| `trg_product_create_inventory` | products | AFTER INSERT | Create inventory row |
| `trg_purchase_item_update_inventory` | purchase_items | AFTER INSERT | Update stock + cost from purchase |
| `trg_purchase_cancel_revert_inventory` | purchases | AFTER UPDATE status | Revert stock on cancel |
| `trg_sale_item_decrease_stock` | sale_items | AFTER INSERT | Decrease stock on sale |
| `trg_sale_cancel_revert_inventory` | sales | AFTER UPDATE status | Restore stock on cancel |
| `trg_validate_stock` | sale_items | BEFORE INSERT | Validate stock before sale |
| `trg_inventory_movement_date` | inventory | BEFORE UPDATE | Update movement_date |
| `trg_invoice_update_sale_invoice_id` | invoices | AFTER INSERT/UPDATE | Sync sale↔invoice |
| `trg_invoice_clear_sale_reference` | invoices | AFTER UPDATE status | Clear on cancel |
| `trg_auto_ncf` | invoices | BEFORE INSERT | Auto-generate NCF |
| `trg_sale_notify` | sales | AFTER INSERT | Notify admins of sale |
| `trg_purchase_notify` | purchases | AFTER INSERT | Notify admins of purchase |
| `trg_inventory_notify` | inventory | AFTER UPDATE stock | Notify stock changes |
| `trg_low_stock_notify` | inventory | AFTER UPDATE stock | Low stock alert |
| `trg_user_notifications_updated_at` | user_notifications | BEFORE UPDATE | Auto updated_at |
| `trg_product_variants_updated_at` | product_variants | BEFORE UPDATE | Auto updated_at |
| `trg_product_variants_touch_product` | product_variants | AFTER INSERT/UPDATE/DELETE | Touch parent |
| `trg_carts_updated_at` | carts | BEFORE UPDATE | Auto updated_at |
| `trg_ecommerce_settings_singleton_insert` | ecommerce_settings | BEFORE INSERT | Singleton redirect |
| `on_product_image_upload` | storage.objects | AFTER INSERT | Sync product images |
| `on_product_image_delete` | storage.objects | AFTER DELETE | Sync product images |
| `on_hero_slide_image_upload` | storage.objects | AFTER INSERT | Sync hero image |
| `on_hero_slide_image_delete` | storage.objects | AFTER DELETE | Sync hero image |
| `on_floating_banner_image_upload` | storage.objects | AFTER INSERT | Sync banner image |
| `on_floating_banner_image_delete` | storage.objects | AFTER DELETE | Sync banner image |
| `on_branding_image_upload` | storage.objects | AFTER INSERT | Sync logo/favicon |
| `on_branding_image_delete` | storage.objects | AFTER DELETE | Sync logo/favicon |
| `calculate_balances` | inventory_ledger | BEFORE INSERT | Auto-calc balances |
| `refresh_balances_trigger` | inventory_ledger | AFTER INSERT | Refresh materialized view |
| `trg_sale_created` | sales | AFTER INSERT | Publish outbox event |
| `trg_sale_status_changed` | sales | AFTER UPDATE | Publish outbox event |
| `trg_purchase_created` | purchases | AFTER INSERT | Publish outbox event |
| `trg_purchase_status_changed` | purchases | AFTER UPDATE | Publish outbox event |
| `set_updated_at` | ~30 tables | BEFORE UPDATE | Auto updated_at |
| `set_company_id` | ~14 tables | BEFORE INSERT | Auto company_id |
| `trg_auto_company_id` | ~15 tables | BEFORE INSERT | Auto company_id from JWT |
| `trg_cash_registers_updated_at` | cash_registers | BEFORE UPDATE | Auto updated_at |
| `trg_cash_register_sessions_updated_at` | cash_register_sessions | BEFORE UPDATE | Auto updated_at |

---

## 1️⃣5️⃣ VIEWS

| View | Type | Purpose |
|------|------|---------|
| `vw_purchase_detail` | Regular | Purchase detail with supplier/user/item data |
| `vw_products_with_stock` | Regular | Products with current stock status |
| `inventory_balances` | Materialized | Inventory balances derived from ledger |
| `company_context` | Regular | Active company data for JWT context |

---

## 1️⃣6️⃣ SQL FUNCTIONS

| Function | Purpose |
|----------|---------|
| `fn_set_updated_at()` | Generic updated_at trigger |
| `fn_open_cash_session()` | Open POS cash session |
| `fn_close_cash_session()` | Close POS cash session |
| `fn_generate_receipt_number()` | Auto-generate receipt numbers |
| `auto_generate_ncf()` | Auto-generate DGII NCF |
| `fn_get_next_ncf()` | Atomic NCF sequence next value |
| `publish_outbox_event()` | Insert event into transactional outbox |
| `auto_assign_company_id()` | Set company_id from JWT |
| `set_company_context()` | Set session company context |
| `get_product_variants()` | RPC: get variants for product |
| `get_cart_item_unit_price()` | RPC: get price for cart item |
| `fn_get_dashboard_stats()` | RPC: aggregated dashboard data |
| `reserve_inventory()` | Reserve stock atomically |
| `release_reservation()` | Cancel stock reservation |
| `fifo_add_layer()` | Add FIFO cost layer |
| `fifo_consume()` | Consume FIFO layers |
| `fn_ecommerce_settings_singleton_insert()` | Singleton upsert for settings |
| `handle_product_image_insert()` | Storage trigger for product images |
| `handle_product_image_delete()` | Storage trigger for product images |
| `handle_hero_slide_image_insert()` | Storage trigger for hero slides |
| `handle_hero_slide_image_delete()` | Storage trigger for hero slides |
| `handle_floating_banner_image_insert()` | Storage trigger for banners |
| `handle_floating_banner_image_delete()` | Storage trigger for banners |
| `handle_branding_image_insert()` | Storage trigger for branding |
| `handle_branding_image_delete()` | Storage trigger for branding |
| `decrease_stock_from_sale()` | Trigger: decrease stock on sale |
| `revert_stock_on_sale_cancel()` | Trigger: restore stock on cancel |
| `create_inventory_on_product_insert()` | Trigger: init inventory for product |
| `update_product_cost_from_purchase()` | Trigger: update cost from purchase |
| `revert_inventory_on_purchase_cancel()` | Trigger: revert on purchase cancel |
| `update_inventory_movement_date()` | Trigger: auto-set movement date |
| `calculate_ledger_balances()` | Trigger: auto-calc ledger balances |
| `refresh_inventory_balances()` | Trigger: refresh materialized view |
| `on_sale_created()` | Trigger: publish outbox event |
| `on_sale_status_changed()` | Trigger: publish outbox event |
| `on_purchase_created()` | Trigger: publish outbox event |
| `on_purchase_status_changed()` | Trigger: publish outbox event |
| `auto_create_client()` | Trigger: auto-create client |
| `sync_client_from_user()` | Trigger: sync client from user |
| `notify_sale_created()` | Trigger: notify sale |
| `notify_purchase_created()` | Trigger: notify purchase |
| `notify_inventory_change()` | Trigger: notify stock change |
| `notify_low_stock()` | Trigger: low stock alert |
| `notify_new_user()` | Trigger: new user notification |
| `validate_stock_before_sale()` | Trigger: validate stock |

---

## 1️⃣7️⃣ MIGRATION FILE INDEX

| # | File | Purpose |
|---|------|---------|
| 001 | `initial_schema.sql` | Core tables: users, roles, clients, products, categories, inventory, purchases, sales, invoices, cart, ecommerce, audit |
| 002 | `seed_data.sql` | Default admin, categories, settings |
| 003 | `hero_reviews.sql` | Hero settings, product reviews |
| 004 | `storage_product_images_trigger.sql` | Product image auto-sync |
| 005 | `ensure_bucket_public.sql` | Storage bucket public access |
| 006 | `ecommerce_enhancements.sql` | Hero slides, floating banners, tax rates, whatsapp config |
| 007 | `hero_slides_storage_trigger.sql` | Hero slide image auto-sync |
| 008a | `add_is_active_to_ecommerce_settings.sql` | is_active column |
| 008b | `clients_from_users.sql` | Auto-create client, credit accounts, notification prefs |
| 009a | `fix_hero_slides_storage_rls.sql` | Fix RLS for anon uploads |
| 009b | `suppliers_inventory_triggers.sql` | Purchase→inventory, sale→stock triggers |
| 010 | `purchase_items_enhancements.sql` | purchase_items columns, auto-create inventory, views |
| 011 | `ecommerce_settings_singleton.sql` | Singleton pattern for settings |
| 012 | `branding_storage_trigger.sql` | Logo/favicon auto-sync |
| 013 | `floating_banners_storage_trigger.sql` | Banner image auto-sync |
| 014 | `erp_enhancements.sql` | **MAJOR**: brands, price lists, warehouses, companies, goods receipts, quality inspections, checkout, coupons, shipping, fiscal docs, NCF, returns, accounting, payment methods |
| 015 | `add_sale_markup_percentage.sql` | Markup percentage config |
| 016 | `fix_double_inventory_and_triggers.sql` | Fix double stock movement, sale cancel revert, NCF fix |
| 017 | `invoice_id_in_sales_and_generic_client.sql` | Sale↔Invoice sync, generic client |
| 018 | `notification_triggers.sql` | Event-based notifications |
| 019 | `add_updated_at_to_notifications.sql` | Updated_at for notifications |
| 020 | `carts_and_cart_items.sql` | New carts + cart_items tables |
| 021 | `product_variants_enhancement.sql` | Variant improvements, RPC function |
| 022 | `cart_items_variant_id.sql` | Variant support in cart |
| 023 | `fix_storage_rls_product_images.sql` | Fix RLS for anon product images |
| 024 | `sale_items_variant_support.sql` | Variant support in sale_items |
| 025 | `fix_variant_inventory_sync_and_verification.sql` | Sync variant+inventory stock |
| 026 | `enterprise_audit_improvements.sql` | **MAJOR**: Indexes, soft delete, audit columns, company_id prep, lots, serials, reservations, FIFO, coupons v2, promotions, wishlist, credit/debit notes, cash registers |
| 027 | `schema_fixes.sql` | Drop legacy tables, fix constraints, unique indexes |
| 028 | `inventory_ledger_and_core_tables.sql` | **MAJOR**: Branches, inventory ledger, materialized view, outbox, debit notes, currencies, payment transactions |
| 029 | `rls_policies_complete.sql` | **MAJOR**: Complete RLS for all domains |
| 030 | `triggers_and_functions.sql` | **MAJOR**: updated_at triggers, ledger balance calc, outbox events, NCF auto-generate, stock validation |
| 031 | `multitenant_architecture.sql` | **MAJOR**: company_id for ALL tables, backfill, indexes, triggers, RLS policies |
| 032 | `standardized_schema.sql` | **MASTER**: Consolidates 029+031+032: helper functions, company_id, backfill, RLS, fiscal docs, NCF seeds |
| 032f | `standardized_schema_fixed.sql` | Fixes for 032 |
| 900 | `cash_register_tables.sql` | Cash registers, sessions, movements, open/close functions |
| hotfix | `hotfix_001_fix_trigger.sql` | Fix auto_create_client trigger, create missing tables |

---

*End of Complete Database Audit*
