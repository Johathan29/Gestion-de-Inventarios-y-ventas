-- ===================================================
-- DATOS DE PRUEBA / SEED
-- ===================================================

-- Usuario admin por defecto (contraseña: Admin123!)
INSERT INTO users (email, password_hash, name, role_id, email_verified, is_active)
SELECT 'admin@sistema.com', '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5GzYq0Ht6Fq1xJ8n0Qd5Kqy', 'Administrador', id, true, true
FROM roles WHERE name = 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@sistema.com');

-- Categorías de ejemplo
INSERT INTO categories (name, slug, description, status, sort_order) VALUES
('Electrónicos', 'electronicos', 'Productos electrónicos y tecnología', 'active', 1),
('Ropa y Accesorios', 'ropa-accesorios', 'Prendas de vestir y accesorios', 'active', 2),
('Hogar', 'hogar', 'Productos para el hogar', 'active', 3),
('Alimentos y Bebidas', 'alimentos-bebidas', 'Alimentos y bebidas', 'active', 4),
('Salud y Belleza', 'salud-belleza', 'Productos de salud y belleza', 'active', 5);

-- Configuración de ecommerce
INSERT INTO ecommerce_settings (store_name, description, contact_email, contact_phone)
VALUES ('Mi Tienda Online', 'Tu tienda de confianza', 'contacto@mitienda.com', '+57 300 123 4567');

-- Configuración de facturación
INSERT INTO system_config (key, value, section, description) VALUES
('company_name', 'Mi Empresa S.A.S.', 'invoice', 'Nombre de la empresa'),
('company_nit', '123456789-0', 'invoice', 'NIT de la empresa'),
('company_address', 'Cra 1 # 2-3, Bogotá', 'invoice', 'Dirección de la empresa'),
('company_phone', '+57 601 234 5678', 'invoice', 'Teléfono de la empresa'),
('iva_rate', '19', 'taxes', 'Porcentaje de IVA'),
('currency_symbol', '$', 'general', 'Símbolo de moneda');
