-- ============================================================
-- MIGRATION 073 — Fix client_notification_preferences
-- La tabla real solo tenía los campos de la migración original
-- (email/whatsapp/purchase/shipping/promo). El dominio del
-- user-service usa además sms_notifications y push_notifications,
-- por lo que el PUT /clients/notification-prefs fallaba con
-- PGRST (columna inexistente) → 500.
-- ============================================================

ALTER TABLE client_notification_preferences
  ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;

-- Asegurar que toda fila existente tenga valores por defecto
UPDATE client_notification_preferences
   SET sms_notifications = COALESCE(sms_notifications, true),
       push_notifications = COALESCE(push_notifications, true)
 WHERE sms_notifications IS NULL OR push_notifications IS NULL;
