# TRD: Notification Service

## 1. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (3000)                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│          notification-service (3016)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Queue    │ │ Template │ │ Channel  │ │ Preference│  │
│  │ Worker   │ │ Manager  │ │ Router   │ │ Manager   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │             │            │              │        │
│  ┌────▼─────────────▼────────────▼──────────────▼─────┐ │
│  │         Notification Infrastructure                │ │
│  │  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ Email (SMTP) │  │ WhatsApp API │                │ │
│  │  │ (nodemailer) │  │ (Cloud API)  │                │ │
│  │  └──────────────┘  └──────────────┘                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 2. Queue Worker

```typescript
// Worker que procesa notification_queue
async function processNotificationQueue() {
  const notifications = await db.query(`
    SELECT * FROM notification_queue 
    WHERE status = 'pending' 
      AND attempts < 3
      AND scheduled_at <= NOW()
    ORDER BY priority DESC, created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  `);
  
  for (const notification of notifications.rows) {
    try {
      await db.query(`
        UPDATE notification_queue SET status = 'processing', attempts = attempts + 1
        WHERE id = $1
      `, [notification.id]);
      
      const template = await getTemplate(notification.event_type, notification.channel);
      const body = renderTemplate(template, notification.payload);
      
      switch (notification.channel) {
        case 'email':
          await sendEmail(notification.recipient, body.subject, body.html);
          break;
        case 'whatsapp':
          await sendWhatsApp(notification.recipient, body.text);
          break;
        case 'in_app':
          await createInAppNotification(notification.user_id, body);
          break;
      }
      
      await db.query(`
        UPDATE notification_queue SET status = 'sent', sent_at = NOW() WHERE id = $1
      `, [notification.id]);
      
    } catch (error) {
      const newStatus = notification.attempts + 1 >= 3 ? 'failed' : 'pending';
      await db.query(`
        UPDATE notification_queue 
        SET status = $1, error_message = $2, 
            next_retry_at = NOW() + INTERVAL '5 minutes'
        WHERE id = $3
      `, [newStatus, error.message, notification.id]);
    }
  }
}

// Ejecutar cada 30 segundos
setInterval(processNotificationQueue, 30000);
```

## 3. Template Rendering

```typescript
function renderTemplate(template: NotificationTemplate, payload: Record<string, any>) {
  let subject = template.subject_template || '';
  let body = template.body_template;
  
  // Simple variable replacement: {{variable}}
  for (const [key, value] of Object.entries(payload)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    subject = subject.replace(regex, String(value));
    body = body.replace(regex, String(value));
  }
  
  return { subject, html: body, text: stripHtml(body) };
}
```

## 4. Default Templates

```sql
INSERT INTO notification_templates (event_type, channel, subject_template, body_template) VALUES
('SaleCreated', 'email', 'Confirmación de pedido #{{sale_id}}', 
 '<h1>¡Gracias por tu compra!</h1><p>Tu pedido #{{sale_id}} ha sido recibido.</p><p>Total: ${{total}}</p>'),
('SaleCreated', 'whatsapp', '', 
 '¡Hola {{client_name}}! Tu pedido #{{sale_id}} por ${{total}} ha sido recibido. Te notificaremos cuando sea enviado.'),
('LowStockDetected', 'email', '⚠️ Stock bajo: {{product_name}}', 
 '<h2>Alerta de Stock Bajo</h2><p>El producto {{product_name}} tiene solo {{current_stock}} unidades en {{warehouse}}.</p>'),
('UserCreated', 'email', '¡Bienvenido a {{company_name}}!', 
 '<h1>Bienvenido {{first_name}}!</h1><p>Tu cuenta ha sido creada exitosamente.</p>');
```
