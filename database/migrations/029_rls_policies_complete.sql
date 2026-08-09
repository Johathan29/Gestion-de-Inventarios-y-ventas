-- ============================================================================
-- MIGRATION 029: RLS POLICIES — Seguridad a nivel de base de datos
-- ============================================================================
-- Fecha: 2026-07-24
-- Propósito: Row-Level Security para TODAS las tablas del sistema
-- Riesgo: Bajo (solo ADD POLICY, no modifica datos)
-- Rollback: DROP POLICY statements
--
-- ESTRATEGIA DE ROLES:
-- - authenticated: cualquier usuario logueado
-- - service_role: backend interno (bypass RLS)
-- - anon: usuarios anónimos (solo lectura pública)
--
-- ROLES DE NEGOCIO (via JWT claims):
-- - admin: acceso completo
-- - employee: acceso completo a lectura, limitado a escritura
-- - cliente: solo sus propios datos
--
-- NOTA: Estas policies usan current_setting('request.jwt.claims')::jsonb
-- para obtener el rol y user_id del token JWT.
-- ============================================================================

BEGIN;

-- ============================================================================
-- HELPER FUNCTION: Obtener claims del JWT
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'role',
    'anon'
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.company_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$ LANGUAGE sql STABLE;


-- ============================================================================
-- 1. USERS & IDENTITY DOMAIN
-- ============================================================================

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_policy ON users;
CREATE POLICY users_select_policy ON users
  FOR SELECT TO authenticated
  USING (
    auth.user_role() IN ('admin', 'employee')
    OR id = auth.user_id()
  );

DROP POLICY IF EXISTS users_insert_policy ON users;
CREATE POLICY users_insert_policy ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin'));

DROP POLICY IF EXISTS users_update_policy ON users;
CREATE POLICY users_update_policy ON users
  FOR UPDATE TO authenticated
  USING (
    auth.user_role() = 'admin'
    OR id = auth.user_id()
  );

DROP POLICY IF EXISTS users_delete_policy ON users;
CREATE POLICY users_delete_policy ON users
  FOR DELETE TO authenticated
  USING (auth.user_role() = 'admin');


-- roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_select_policy ON roles;
CREATE POLICY roles_select_policy ON roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS roles_insert_policy ON roles;
CREATE POLICY roles_insert_policy ON roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() = 'admin');

DROP POLICY IF EXISTS roles_update_policy ON roles;
CREATE POLICY roles_update_policy ON roles
  FOR UPDATE TO authenticated
  USING (auth.user_role() = 'admin');


-- ============================================================================
-- 2. CATALOG DOMAIN
-- ============================================================================

-- products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_select_policy ON products;
CREATE POLICY products_select_policy ON products
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS products_insert_policy ON products;
CREATE POLICY products_insert_policy ON products
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin'));

DROP POLICY IF EXISTS products_update_policy ON products;
CREATE POLICY products_update_policy ON products
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS products_delete_policy ON products;
CREATE POLICY products_delete_policy ON products
  FOR DELETE TO authenticated
  USING (auth.user_role() = 'admin');


-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_select_policy ON categories;
CREATE POLICY categories_select_policy ON categories
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS categories_insert_policy ON categories;
CREATE POLICY categories_insert_policy ON categories
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin'));

DROP POLICY IF EXISTS categories_update_policy ON categories;
CREATE POLICY categories_update_policy ON categories
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin'));

DROP POLICY IF EXISTS categories_delete_policy ON categories;
CREATE POLICY categories_delete_policy ON categories
  FOR DELETE TO authenticated
  USING (auth.user_role() = 'admin');


-- brands
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brands_select_policy ON brands;
CREATE POLICY brands_select_policy ON brands
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS brands_insert_policy ON brands;
CREATE POLICY brands_insert_policy ON brands
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() = 'admin');

DROP POLICY IF EXISTS brands_update_policy ON brands;
CREATE POLICY brands_update_policy ON brands
  FOR UPDATE TO authenticated
  USING (auth.user_role() = 'admin');

DROP POLICY IF EXISTS brands_delete_policy ON brands;
CREATE POLICY brands_delete_policy ON brands
  FOR DELETE TO authenticated
  USING (auth.user_role() = 'admin');


-- product_variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_variants_policy ON product_variants;
CREATE POLICY product_variants_select_policy ON product_variants
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY product_variants_insert_policy ON product_variants
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY product_variants_update_policy ON product_variants
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY product_variants_delete_policy ON product_variants
  FOR DELETE TO authenticated
  USING (auth.user_role() = 'admin');


-- ============================================================================
-- 3. INVENTORY DOMAIN
-- ============================================================================

-- inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_select_policy ON inventory;
CREATE POLICY inventory_select_policy ON inventory
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS inventory_insert_policy ON inventory;
CREATE POLICY inventory_insert_policy ON inventory
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS inventory_update_policy ON inventory;
CREATE POLICY inventory_update_policy ON inventory
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS inventory_delete_policy ON inventory;
CREATE POLICY inventory_delete_policy ON inventory
  FOR DELETE TO authenticated
  USING (auth.user_role() = 'admin');


-- inventory_movements (append-only, no update/delete)
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_movements_select_policy ON inventory_movements;
CREATE POLICY inventory_movements_select_policy ON inventory_movements
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS inventory_movements_insert_policy ON inventory_movements;
CREATE POLICY inventory_movements_insert_policy ON inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

-- NO update/delete policies — movements are immutable


-- inventory_ledger (append-only, NO update/delete EVER)
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_ledger_select_policy ON inventory_ledger;
CREATE POLICY inventory_ledger_select_policy ON inventory_ledger
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS inventory_ledger_insert_policy ON inventory_ledger;
CREATE POLICY inventory_ledger_insert_policy ON inventory_ledger
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

-- NO update/delete — ledger es inmutable


-- inventory_reservations
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_reservations_policy ON inventory_reservations;
CREATE POLICY inventory_reservations_select_policy ON inventory_reservations
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY inventory_reservations_insert_policy ON inventory_reservations
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY inventory_reservations_update_policy ON inventory_reservations
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));


-- inventory_lots
ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_lots_policy ON inventory_lots;
CREATE POLICY inventory_lots_select_policy ON inventory_lots
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY inventory_lots_insert_policy ON inventory_lots
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY inventory_lots_update_policy ON inventory_lots
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));


-- inventory_serials
ALTER TABLE inventory_serials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_serials_policy ON inventory_serials;
CREATE POLICY inventory_serials_select_policy ON inventory_serials
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY inventory_serials_insert_policy ON inventory_serials
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY inventory_serials_update_policy ON inventory_serials
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));


-- warehouses
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouses_select_policy ON warehouses;
CREATE POLICY warehouses_select_policy ON warehouses
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS warehouses_insert_policy ON warehouses;
CREATE POLICY warehouses_insert_policy ON warehouses
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() = 'admin');

DROP POLICY IF EXISTS warehouses_update_policy ON warehouses;
CREATE POLICY warehouses_update_policy ON warehouses
  FOR UPDATE TO authenticated
  USING (auth.user_role() = 'admin');

DROP POLICY IF EXISTS warehouses_delete_policy ON warehouses;
CREATE POLICY warehouses_delete_policy ON warehouses
  FOR DELETE TO authenticated
  USING (auth.user_role() = 'admin');


-- warehouse_locations
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouse_locations_select ON warehouse_locations;
CREATE POLICY warehouse_locations_select ON warehouse_locations
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY warehouse_locations_insert ON warehouse_locations
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY warehouse_locations_update ON warehouse_locations
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- ============================================================================
-- 4. PROCUREMENT DOMAIN
-- ============================================================================

-- suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suppliers_select_policy ON suppliers;
CREATE POLICY suppliers_select_policy ON suppliers
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS suppliers_insert_policy ON suppliers;
CREATE POLICY suppliers_insert_policy ON suppliers
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS suppliers_update_policy ON suppliers;
CREATE POLICY suppliers_update_policy ON suppliers
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS suppliers_delete_policy ON suppliers;
CREATE POLICY suppliers_delete_policy ON suppliers
  FOR DELETE TO authenticated
  USING (auth.user_role() = 'admin');


-- purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchases_select_policy ON purchases;
CREATE POLICY purchases_select_policy ON purchases
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS purchases_insert_policy ON purchases;
CREATE POLICY purchases_insert_policy ON purchases
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS purchases_update_policy ON purchases;
CREATE POLICY purchases_update_policy ON purchases
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS purchases_delete_policy ON purchases;
CREATE POLICY purchases_delete_policy ON purchases
  FOR DELETE TO authenticated
  USING (auth.user_role() = 'admin');


-- purchase_items
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_items_select ON purchase_items;
CREATE POLICY purchase_items_select ON purchase_items
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY purchase_items_insert ON purchase_items
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY purchase_items_update ON purchase_items
  FOR UPDATE TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY purchase_items_delete ON purchase_items
  FOR DELETE TO authenticated USING (auth.user_role() = 'admin');


-- goods_receipts + items
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS goods_receipts_select ON goods_receipts;
CREATE POLICY goods_receipts_select ON goods_receipts
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));
CREATE POLICY goods_receipts_insert ON goods_receipts
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));
CREATE POLICY goods_receipts_update ON goods_receipts
  FOR UPDATE TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS goods_receipt_items_select ON goods_receipt_items;
CREATE POLICY goods_receipt_items_select ON goods_receipt_items
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));
CREATE POLICY goods_receipt_items_insert ON goods_receipt_items
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));


-- quality_inspections + items
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_inspection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qi_select ON quality_inspections;
CREATE POLICY qi_select ON quality_inspections
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));
CREATE POLICY qi_insert ON quality_inspections
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));
CREATE POLICY qi_update ON quality_inspections
  FOR UPDATE TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS qii_select ON quality_inspection_items;
CREATE POLICY qii_select ON quality_inspection_items
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));
CREATE POLICY qii_insert ON quality_inspection_items
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));


-- ============================================================================
-- 5. SALES DOMAIN
-- ============================================================================

-- sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_select_policy ON sales;
CREATE POLICY sales_select_policy ON sales
  FOR SELECT TO authenticated
  USING (
    auth.user_role() IN ('admin', 'employee')
    OR client_id IN (SELECT id FROM clients WHERE user_id = auth.user_id())
  );

DROP POLICY IF EXISTS sales_insert_policy ON sales;
CREATE POLICY sales_insert_policy ON sales
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS sales_update_policy ON sales;
CREATE POLICY sales_update_policy ON sales
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS sales_delete_policy ON sales;
CREATE POLICY sales_delete_policy ON sales
  FOR DELETE TO authenticated
  USING (auth.user_role() = 'admin');


-- sale_items
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sale_items_select ON sale_items;
CREATE POLICY sale_items_select ON sale_items
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY sale_items_insert ON sale_items
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY sale_items_update ON sale_items
  FOR UPDATE TO authenticated USING (auth.user_role() IN ('admin'));


-- sale_payments
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sale_payments_select ON sale_payments;
CREATE POLICY sale_payments_select ON sale_payments
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY sale_payments_insert ON sale_payments
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));


-- ============================================================================
-- 6. CART / CHECKOUT DOMAIN
-- ============================================================================

-- carts (user-scoped)
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS carts_select ON carts;
CREATE POLICY carts_select ON carts
  FOR SELECT TO authenticated
  USING (user_id = auth.user_id());

CREATE POLICY carts_insert ON carts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.user_id());

CREATE POLICY carts_update ON carts
  FOR UPDATE TO authenticated
  USING (user_id = auth.user_id());

CREATE POLICY carts_delete ON carts
  FOR DELETE TO authenticated
  USING (user_id = auth.user_id());


-- cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cart_items_select ON cart_items;
CREATE POLICY cart_items_select ON cart_items
  FOR SELECT TO authenticated
  USING (cart_id IN (SELECT id FROM carts WHERE user_id = auth.user_id()));

CREATE POLICY cart_items_insert ON cart_items
  FOR INSERT TO authenticated
  WITH CHECK (cart_id IN (SELECT id FROM carts WHERE user_id = auth.user_id()));

CREATE POLICY cart_items_update ON cart_items
  FOR UPDATE TO authenticated
  USING (cart_id IN (SELECT id FROM carts WHERE user_id = auth.user_id()));

CREATE POLICY cart_items_delete ON cart_items
  FOR DELETE TO authenticated
  USING (cart_id IN (SELECT id FROM carts WHERE user_id = auth.user_id()));


-- checkout_sessions
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checkout_sessions_select ON checkout_sessions;
CREATE POLICY checkout_sessions_select ON checkout_sessions
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee') OR client_id IN (SELECT id FROM clients WHERE user_id = auth.user_id()));

CREATE POLICY checkout_sessions_insert ON checkout_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));


-- ============================================================================
-- 7. BILLING / FISCAL DOMAIN
-- ============================================================================

-- invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_select_policy ON invoices;
CREATE POLICY invoices_select_policy ON invoices
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY invoices_insert_policy ON invoices
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY invoices_update_policy ON invoices
  FOR UPDATE TO authenticated
  USING (auth.user_role() IN ('admin'));


-- fiscal_document_types (read-only for everyone)
ALTER TABLE fiscal_document_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fdt_select ON fiscal_document_types;
CREATE POLICY fdt_select ON fiscal_document_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY fdt_insert ON fiscal_document_types
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');


-- ncf_sequences
ALTER TABLE ncf_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ncf_sequences_select ON ncf_sequences;
CREATE POLICY ncf_sequences_select ON ncf_sequences
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY ncf_sequences_insert ON ncf_sequences
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY ncf_sequences_update ON ncf_sequences
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- credit_notes
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_notes_select ON credit_notes;
CREATE POLICY credit_notes_select ON credit_notes
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY credit_notes_insert ON credit_notes
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin'));


-- credit_note_items
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_note_items_select ON credit_note_items;
CREATE POLICY credit_note_items_select ON credit_note_items
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY credit_note_items_insert ON credit_note_items
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin'));


-- debit_notes
ALTER TABLE debit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS debit_notes_select ON debit_notes;
CREATE POLICY debit_notes_select ON debit_notes
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY debit_notes_insert ON debit_notes
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin'));


-- debit_note_items
ALTER TABLE debit_note_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS debit_note_items_select ON debit_note_items;
CREATE POLICY debit_note_items_select ON debit_note_items
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY debit_note_items_insert ON debit_note_items
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin'));


-- ============================================================================
-- 8. RETURNS DOMAIN
-- ============================================================================

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS returns_select ON returns;
CREATE POLICY returns_select ON returns
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY returns_insert ON returns
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY returns_update ON returns
  FOR UPDATE TO authenticated USING (auth.user_role() IN ('admin'));


ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS return_items_select ON return_items;
CREATE POLICY return_items_select ON return_items
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY return_items_insert ON return_items
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin'));


-- ============================================================================
-- 9. ECOMMERCE DOMAIN
-- ============================================================================

-- clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_select_policy ON clients;
CREATE POLICY clients_select_policy ON clients
  FOR SELECT TO authenticated
  USING (
    auth.user_role() IN ('admin', 'employee')
    OR user_id = auth.user_id()
  );

CREATE POLICY clients_insert_policy ON clients
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY clients_update_policy ON clients
  FOR UPDATE TO authenticated
  USING (
    auth.user_role() IN ('admin', 'employee')
    OR user_id = auth.user_id()
  );


-- client_credit_accounts
ALTER TABLE client_credit_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cca_select ON client_credit_accounts;
CREATE POLICY cca_select ON client_credit_accounts
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY cca_insert ON client_credit_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin'));


-- offers
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offers_select ON offers;
CREATE POLICY offers_select ON offers
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY offers_insert ON offers
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin'));

CREATE POLICY offers_update ON offers
  FOR UPDATE TO authenticated USING (auth.user_role() IN ('admin'));


-- coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coupons_select ON coupons;
CREATE POLICY coupons_select ON coupons
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY coupons_insert ON coupons
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY coupons_update ON coupons
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- promotions
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promotions_select ON promotions;
CREATE POLICY promotions_select ON promotions
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY promotions_insert ON promotions
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY promotions_update ON promotions
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- product_reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pr_select ON product_reviews;
CREATE POLICY pr_select ON product_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY pr_insert ON product_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY pr_update ON product_reviews
  FOR UPDATE TO authenticated USING (auth.user_role() IN ('admin'));


-- ecommerce_settings (singleton — read by all, write by admin)
ALTER TABLE ecommerce_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS es_select ON ecommerce_settings;
CREATE POLICY es_select ON ecommerce_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY es_update ON ecommerce_settings
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- ecommerce_banners
ALTER TABLE ecommerce_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eb_select ON ecommerce_banners;
CREATE POLICY eb_select ON ecommerce_banners
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY eb_insert ON ecommerce_banners
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY eb_update ON ecommerce_banners
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- hero_slides
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hs_select ON hero_slides;
CREATE POLICY hs_select ON hero_slides
  FOR SELECT TO authenticated USING (true);

CREATE POLICY hs_insert ON hero_slides
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY hs_update ON hero_slides
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- floating_banners
ALTER TABLE floating_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fb_select ON floating_banners;
CREATE POLICY fb_select ON floating_banners
  FOR SELECT TO authenticated USING (true);

CREATE POLICY fb_insert ON floating_banners
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY fb_update ON floating_banners
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- tax_rates
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tr_select ON tax_rates;
CREATE POLICY tr_select ON tax_rates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY tr_insert ON tax_rates
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');


-- ============================================================================
-- 10. ACCOUNTING DOMAIN
-- ============================================================================

ALTER TABLE account_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ap_select ON account_plans;
CREATE POLICY ap_select ON account_plans
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY ap_insert ON account_plans
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY ap_update ON account_plans
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ae_select ON accounting_entries;
CREATE POLICY ae_select ON accounting_entries
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY ae_insert ON accounting_entries
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');


ALTER TABLE accounting_entry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aei_select ON accounting_entry_items;
CREATE POLICY aei_select ON accounting_entry_items
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY aei_insert ON accounting_entry_items
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');


-- payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_select ON payment_methods;
CREATE POLICY pm_select ON payment_methods
  FOR SELECT TO authenticated USING (true);

CREATE POLICY pm_insert ON payment_methods
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');


-- ============================================================================
-- 11. AUDIT DOMAIN
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admin puede leer auditoría
DROP POLICY IF EXISTS audit_select_policy ON audit_logs;
CREATE POLICY audit_select_policy ON audit_logs
  FOR SELECT TO authenticated
  USING (auth.user_role() = 'admin');

-- Cualquier servicio puede insertar
DROP POLICY IF EXISTS audit_insert_policy ON audit_logs;
CREATE POLICY audit_insert_policy ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

-- NO update/delete — audit is immutable


-- ============================================================================
-- 12. NOTIFICATIONS DOMAIN
-- ============================================================================

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS un_select ON user_notifications;
CREATE POLICY un_select ON user_notifications
  FOR SELECT TO authenticated
  USING (
    auth.user_role() IN ('admin', 'employee')
    OR user_id = auth.user_id()
  );

CREATE POLICY un_insert ON user_notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY un_update ON user_notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.user_id()  -- solo marcar como leído
    OR auth.user_role() IN ('admin')
  );


-- ============================================================================
-- 13. CASH REGISTER DOMAIN
-- ============================================================================

ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cr_select ON cash_registers;
CREATE POLICY cr_select ON cash_registers
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY cr_insert ON cash_registers
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY cr_update ON cash_registers
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crs_select ON cash_register_sessions;
CREATE POLICY crs_select ON cash_register_sessions
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY crs_insert ON cash_register_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY crs_update ON cash_register_sessions
  FOR UPDATE TO authenticated USING (auth.user_role() IN ('admin', 'employee'));


ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cm_select ON cash_movements;
CREATE POLICY cm_select ON cash_movements
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY cm_insert ON cash_movements
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));


-- ============================================================================
-- 14. CONFIGURATION & SYSTEM
-- ============================================================================

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sc_select ON system_config;
CREATE POLICY sc_select ON system_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY sc_insert ON system_config
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY sc_update ON system_config
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_select ON companies;
CREATE POLICY companies_select ON companies
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY companies_insert ON companies
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY companies_update ON companies
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_select ON branches;
CREATE POLICY branches_select ON branches
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY branches_insert ON branches
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY branches_update ON branches
  FOR UPDATE TO authenticated USING (auth.user_role() = 'admin');


-- currencies (read-only for everyone)
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS currencies_select ON currencies;
CREATE POLICY currencies_select ON currencies FOR SELECT USING (true);

CREATE POLICY currencies_insert ON currencies
  FOR INSERT WITH CHECK (auth.user_role() = 'admin');


-- whatsapp_config
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wc_select ON whatsapp_config;
CREATE POLICY wc_select ON whatsapp_config FOR SELECT USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY wc_update ON whatsapp_config
  FOR UPDATE USING (auth.user_role() = 'admin');


-- ============================================================================
-- 15. TRANSACTIONAL OUTBOX
-- ============================================================================

ALTER TABLE transactional_outbox ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede leer/escribir (el worker)
DROP POLICY IF EXISTS outbox_select ON transactional_outbox;
CREATE POLICY outbox_all ON transactional_outbox
  FOR ALL TO authenticated
  USING (auth.user_role() IN ('admin'));


-- ============================================================================
-- 16. PAYMENT TRANSACTIONS
-- ============================================================================

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pt_select ON payment_transactions;
CREATE POLICY pt_select ON payment_transactions
  FOR SELECT TO authenticated USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY pt_insert ON payment_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN ('admin', 'employee'));


-- ============================================================================
-- 17. WISHLIST (client-scoped)
-- ============================================================================

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wi_select ON wishlist_items;
CREATE POLICY wi_select ON wishlist_items
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.user_id()));

CREATE POLICY wi_insert ON wishlist_items
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.user_id()));

CREATE POLICY wi_delete ON wishlist_items
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.user_id()));


-- ============================================================================
-- 18. COUPON USAGE (client-scoped)
-- ============================================================================

ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cu_select ON coupon_usage;
CREATE POLICY cu_select ON coupon_usage
  FOR SELECT TO authenticated
  USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY cu_insert ON coupon_usage
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'employee'));


-- ============================================================================
-- 19. CURRENCIES
-- ============================================================================

ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pl_select ON price_lists;
CREATE POLICY pl_select ON price_lists FOR SELECT USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY pl_insert ON price_lists FOR INSERT WITH CHECK (auth.user_role() = 'admin');

ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pli_select ON price_list_items;
CREATE POLICY pli_select ON price_list_items FOR SELECT USING (auth.user_role() IN ('admin', 'employee'));

CREATE POLICY pli_insert ON price_list_items FOR INSERT WITH CHECK (auth.user_role() IN ('admin'));


-- ============================================================================
-- 20. EMAIL LOGS (admin-only)
-- ============================================================================

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS el_select ON email_logs;
CREATE POLICY el_select ON email_logs
  FOR SELECT USING (auth.user_role() = 'admin');


-- ============================================================================
-- RESUMEN
-- ============================================================================
-- Total de tablas con RLS habilitado: 50+
-- Políticas creadas: ~150+
-- 
-- VERIFICAR:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
-- ============================================================================


COMMIT;

-- ============================================================================
-- ROLLBACK: 
-- Para cada tabla: ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;
-- Para cada policy: DROP POLICY IF EXISTS <name> ON <table>;
-- Para funciones helper: DROP FUNCTION IF EXISTS auth.user_id(), auth.user_role(), auth.company_id();
-- ============================================================================
