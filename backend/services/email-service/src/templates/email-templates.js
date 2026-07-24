// ============================================================
// Plantillas de Correos Electrónicos
// ============================================================

const APP_NAME = 'Sistema de Gestión de Inventarios y Ventas';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Plantilla base con header, contenido y footer
 */
const baseLayout = (contentHtml) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">${APP_NAME}</h1>
    </div>
    <div style="padding: 32px; background: #fff;">
      ${contentHtml}
    </div>
    <div style="padding: 24px 32px; background: #f1f5f9; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">
        © ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.<br>
        <span style="font-size: 12px;">Este es un mensaje automático, por favor no respondas a este correo.</span>
      </p>
    </div>
  </div>
`;

/**
 * Plantilla de botón reutilizable
 */
const buttonStyle = (url, text) => `
  <div style="text-align: center; margin: 28px 0;">
    <a href="${url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff !important; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; display: inline-block; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
      ${text}
    </a>
  </div>
`;

/**
 * ============================================
 * 1. BIENVENIDA — Cliente
 * ============================================
 */
const welcomeClient = ({ name, email }) => baseLayout(`
  <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 8px 0;">¡Bienvenido, ${name}! 🎉</h2>
  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
    Nos alegra que te hayas registrado en <strong>${APP_NAME}</strong>. A partir de ahora podrás:
  </p>
  <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px;">
    <li>🛍️ Explorar nuestro catálogo de productos</li>
    <li>🛒 Realizar compras de forma rápida y segura</li>
    <li>📦 Dar seguimiento a tus pedidos</li>
    <li>💳 Recibir notificaciones de ofertas y nuevos productos</li>
  </ul>
  <div style="background: #f1f5f9; border-radius: 10px; padding: 16px; margin: 20px 0;">
    <p style="color: #64748b; font-size: 14px; margin: 0;"><strong>Email registrado:</strong> ${email}</p>
  </div>
  ${buttonStyle(FRONTEND_URL, 'Ir a la Tienda')}
  <p style="color: #94a3b8; font-size: 14px; margin: 16px 0 0 0;">
    Si tienes alguna duda, contáctanos. ¡Disfruta tu experiencia!
  </p>
`);

/**
 * ============================================
 * 2. RESTABLECER CONTRASEÑA — Todos los roles
 * ============================================
 */
const passwordReset = ({ name, resetUrl }) => baseLayout(`
  <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">Restablecer Contraseña 🔐</h2>
  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
    Hola <strong>${name}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta.
  </p>
  <p style="color: #475569; font-size: 15px; line-height: 1.5; margin: 16px 0;">
    Haz clic en el siguiente botón para crear una nueva contraseña. Este enlace <strong>expira en 1 hora</strong>.
  </p>
  ${buttonStyle(resetUrl, 'Restablecer Contraseña')}
  <p style="color: #94a3b8; font-size: 14px; margin: 20px 0 0 0;">
    Si no solicitaste este cambio, puedes ignorar este mensaje. Tu cuenta está segura.
  </p>
`);

/**
 * ============================================
 * 3. NUEVOS PRODUCTOS — Cliente, Vendedor, Admin
 * ============================================
 */
const newProducts = ({ name, products, role }) => {
  const roleGreeting = role === 'cliente' ? 'Hola' : role === 'vendedor' ? 'Vendedor' : 'Administrador';
  const productsList = products.map(p => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">
        <img src="${p.image_url || 'https://via.placeholder.com/40'}" alt="${p.name}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 500;">${p.name}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #475569;">${p.category || '—'}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #059669; font-weight: 600;">$${Number(p.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return baseLayout(`
    <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">🆕 Nuevos Productos</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
      ${roleGreeting} <strong>${name}</strong>, te informamos que se han agregado <strong>${products.length}</strong> producto(s) nuevo(s) al catálogo:
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background: #f8fafc;">
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Img</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Producto</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Categoría</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Precio</th>
        </tr>
      </thead>
      <tbody>${productsList}</tbody>
    </table>
    ${buttonStyle(FRONTEND_URL + '/productos', 'Ver Todos los Productos')}
  `);
};

/**
 * ============================================
 * 4. CONFIRMACIÓN DE COMPRA — Cliente
 * ============================================
 */
const purchaseConfirmation = ({ name, sale }) => {
  const itemsList = (sale.items || []).map(item => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${item.product_name || item.name}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #475569; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #475569; text-align: right;">$${Number(item.unit_price || item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #059669; font-weight: 600; text-align: right;">$${Number(item.total || item.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return baseLayout(`
    <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">✅ ¡Compra Confirmada!</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
      Hola <strong>${name}</strong>, tu compra ha sido procesada exitosamente.
    </p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 16px 0;">
      <p style="color: #166534; font-size: 14px; margin: 0;">
        <strong>Folio:</strong> ${sale.folio || sale.id || 'N/A'}<br>
        <strong>Fecha:</strong> ${new Date(sale.created_at || sale.date || new Date()).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}<br>
        <strong>Método de pago:</strong> ${sale.payment_method || sale.paymentMethod || 'N/A'}
      </p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background: #f8fafc;">
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Producto</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Cant</th>
          <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Precio</th>
          <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsList}</tbody>
    </table>
    <div style="border-top: 2px solid #1e293b; padding: 12px 0; text-align: right;">
      <span style="font-size: 20px; font-weight: 700; color: #1e293b;">Total: $${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
    ${buttonStyle(FRONTEND_URL + '/mis-compras', 'Ver Mis Compras')}
    <p style="color: #94a3b8; font-size: 14px; margin: 16px 0 0 0;">¡Gracias por tu preferencia! 🙌</p>
  `);
};

/**
 * ============================================
 * 5. NUEVA OFERTA — Vendedor, Admin
 * ============================================
 */
const newOffer = ({ name, offer, role }) => {
  const greeting = role === 'vendedor' ? 'Vendedor' : 'Administrador';
  return baseLayout(`
    <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">🔥 Nueva Oferta Creada</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
      ${greeting} <strong>${name}</strong>, se ha creado una nueva oferta:
    </p>
    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 20px; margin: 16px 0;">
      <h3 style="color: #c2410c; margin: 0 0 8px 0; font-size: 18px;">${offer.title || offer.name || 'Oferta'}</h3>
      ${offer.description ? `<p style="color: #9a3412; font-size: 14px; margin: 0 0 12px 0;">${offer.description}</p>` : ''}
      <p style="color: #475569; font-size: 14px; margin: 4px 0;">
        <strong>Descuento:</strong> ${offer.discount_percent || offer.discount}%
      </p>
      ${offer.valid_until ? `<p style="color: #475569; font-size: 14px; margin: 4px 0;"><strong>Válido hasta:</strong> ${new Date(offer.valid_until).toLocaleDateString('es-MX')}</p>` : ''}
    </div>
    ${buttonStyle(FRONTEND_URL + '/ofertas', 'Ver Ofertas')}
  `);
};

/**
 * ============================================
 * 6. VENTA REALIZADA — Vendedor, Admin
 * ============================================
 */
const saleNotification = ({ name, sale, role }) => {
  const greeting = role === 'vendedor' ? 'Vendedor' : 'Administrador';
  return baseLayout(`
    <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">💰 Venta Registrada</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
      ${greeting} <strong>${name}</strong>, se ha registrado una nueva venta en el sistema:
    </p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 16px 0;">
      <p style="color: #166534; font-size: 14px; margin: 4px 0;">
        <strong>Folio:</strong> ${sale.folio || sale.id || 'N/A'}<br>
        <strong>Cliente:</strong> ${sale.client_name || sale.client?.name || 'N/A'}<br>
        <strong>Total:</strong> $${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}<br>
        <strong>Fecha:</strong> ${new Date(sale.created_at || sale.date || new Date()).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}<br>
        <strong>Artículos:</strong> ${sale.items_count || sale.items?.length || 0}
      </p>
    </div>
    ${buttonStyle(FRONTEND_URL + '/ventas', 'Ver Ventas')}
  `);
};

/**
 * ============================================
 * 7. COMPRA DE REPOSICIÓN — Vendedor, Admin
 * ============================================
 */
const restockPurchase = ({ name, purchase, role }) => {
  const greeting = role === 'vendedor' ? 'Vendedor' : 'Administrador';
  const itemsList = (purchase.items || []).map(item => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${item.product_name || item.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #475569; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #475569; text-align: right;">$${Number(item.total || item.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return baseLayout(`
    <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">📦 Orden de Reposición</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
      ${greeting} <strong>${name}</strong>, se ha generado una orden de compra para reposición de inventario:
    </p>
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin: 16px 0;">
      <p style="color: #1e40af; font-size: 14px; margin: 4px 0;">
        <strong>Orden #:</strong> ${purchase.order_number || purchase.id || 'N/A'}<br>
        <strong>Proveedor:</strong> ${purchase.supplier_name || purchase.supplier?.name || 'N/A'}<br>
        <strong>Estado:</strong> ${purchase.status || 'Pendiente'}<br>
        <strong>Total:</strong> $${Number(purchase.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}<br>
        <strong>Fecha:</strong> ${new Date(purchase.created_at || purchase.date || new Date()).toLocaleDateString('es-MX')}
      </p>
    </div>
    ${itemsList ? `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Producto</th>
            <th style="padding: 8px 12px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Cant</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsList}</tbody>
      </table>
    ` : ''}
    ${buttonStyle(FRONTEND_URL + '/compras', 'Ver Órdenes de Compra')}
  `);
};

/**
 * ============================================
 * 8. EVENTO DEL SISTEMA — Admin
 * ============================================
 */
const systemEvent = ({ name, event }) => baseLayout(`
  <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">🔔 Evento del Sistema</h2>
  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
    Administrador <strong>${name}</strong>, se ha registrado el siguiente evento en el sistema:
  </p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 16px 0;">
    <p style="color: #1e293b; font-size: 14px; margin: 4px 0;">
      <strong>Tipo:</strong> ${event.type || event.event_type || 'N/A'}<br>
      <strong>Entidad:</strong> ${event.entity || 'N/A'}<br>
      <strong>Descripción:</strong> ${event.description || event.message || 'N/A'}<br>
      <strong>Fecha:</strong> ${new Date(event.created_at || event.date || new Date()).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}<br>
      ${event.user_name ? `<strong>Usuario:</strong> ${event.user_name}<br>` : ''}
      ${event.details ? `<strong>Detalles:</strong> ${typeof event.details === 'object' ? JSON.stringify(event.details) : event.details}` : ''}
    </p>
  </div>
  ${buttonStyle(FRONTEND_URL + '/admin/eventos', 'Ver Panel de Administración')}
`);

/**
 * ============================================
 * 9. NOTIFICACIÓN DE PEDIDO — Cliente
 * ============================================
 */
const orderStatusUpdate = ({ name, order, status }) => {
  const statusConfig = {
    shipped: { emoji: '🚚', title: 'Pedido Enviado', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
    delivered: { emoji: '📦', title: 'Pedido Entregado', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
    cancelled: { emoji: '❌', title: 'Pedido Cancelado', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  };
  const cfg = statusConfig[status] || { emoji: '📋', title: 'Actualización de Pedido', color: '#1e293b', bg: '#f8fafc', border: '#e2e8f0' };

  return baseLayout(`
    <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">${cfg.emoji} ${cfg.title}</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
      Hola <strong>${name}</strong>, el estado de tu pedido ha sido actualizado:
    </p>
    <div style="background: ${cfg.bg}; border: 1px solid ${cfg.border}; border-radius: 10px; padding: 16px; margin: 16px 0;">
      <p style="color: ${cfg.color}; font-size: 14px; margin: 4px 0;">
        <strong>Pedido:</strong> ${order.folio || order.id || 'N/A'}<br>
        <strong>Estado:</strong> ${order.status || status}<br>
        <strong>Total:</strong> $${Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}<br>
        <strong>Fecha:</strong> ${new Date(order.updated_at || order.date || new Date()).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
    ${buttonStyle(FRONTEND_URL + '/mis-compras', 'Seguimiento de Pedido')}
  `);
};

/**
 * ============================================
 * 10. DATOS DE REGISTRO — Cliente (bienvenida + datos)
 * ============================================
 */
const registrationData = ({ name, email, phone, role }) => baseLayout(`
  <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">📋 Datos de Registro</h2>
  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
    Hola <strong>${name}</strong>, tu registro en <strong>${APP_NAME}</strong> se ha completado exitosamente.
  </p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 16px 0;">
    <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 12px 0;">Tus datos registrados:</h3>
    <table style="width: 100%;">
      <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Nombre</td><td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${name}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Email</td><td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${email}</td></tr>
      ${phone ? `<tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Teléfono</td><td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${phone}</td></tr>` : ''}
      <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Rol</td><td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${role || 'Cliente'}</td></tr>
    </table>
  </div>
  ${buttonStyle(FRONTEND_URL, 'Ir a la Tienda')}
  <p style="color: #94a3b8; font-size: 14px; margin: 16px 0 0 0;">
    Si tienes alguna duda, contáctanos. ¡Bienvenido! 🎉
  </p>
`);

module.exports = {
  baseLayout,
  buttonStyle,
  welcomeClient,
  passwordReset,
  newProducts,
  purchaseConfirmation,
  newOffer,
  saleNotification,
  restockPurchase,
  systemEvent,
  orderStatusUpdate,
  registrationData
};
