const axios = require('axios');

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_TOKEN = process.env.WHATSAPP_API_TOKEN;

/**
 * Enviar mensaje de WhatsApp
 */
const sendMessage = async (req, res, next) => {
  try {
    const { to, message, type = 'text' } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Destinatario y mensaje requeridos' }
      });
    }

    let payload;
    if (type === 'template') {
      payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: message
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: message }
      };
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      data: { messageId: response.data.messages?.[0]?.id, status: 'sent' }
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: { code: 'WHATSAPP_ERROR', message: error.response.data?.error?.message || 'Error de WhatsApp API' }
      });
    }
    next(error);
  }
};

/**
 * Enviar notificación de pedido
 */
const sendOrderNotification = async (req, res, next) => {
  try {
    const { to, orderNumber, status, total } = req.body;

    const statusMessages = {
      confirmed: `✅ *Pedido Confirmado* \n\nTu pedido #${orderNumber} ha sido confirmado.\nTotal: $${Number(total).toLocaleString('es-CO')}\nTe notificaremos cuando sea enviado.`,
      shipped: `🚚 *Pedido Enviado* \n\nTu pedido #${orderNumber} ha sido enviado.\nPronto recibirás actualizaciones.`,
      delivered: `📦 *Pedido Entregado* \n\nTu pedido #${orderNumber} ha sido entregado.\n¡Gracias por tu compra!`,
      promotion: `🎉 *Promoción Especial* \n\n${req.body.message || 'Aprovecha nuestras ofertas exclusivas.'}`
    };

    const message = statusMessages[status] || `Estado de pedido #${orderNumber}: ${status}`;

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { preview_url: false, body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      data: { messageId: response.data.messages?.[0]?.id, status: 'sent' }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendMessage, sendOrderNotification };
