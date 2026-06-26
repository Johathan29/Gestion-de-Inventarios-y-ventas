/**
 * Utilidades generales del sistema
 */

/**
 * Sanitiza texto eliminando caracteres peligrosos
 */
const sanitizeText = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/script/gi, '')
    .trim();
};

/**
 * Sanitiza un objeto recursivamente
 */
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
};

/**
 * Genera un SKU único
 */
const generateSKU = (categoryCode, productId, variant = '') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  const variantPart = variant ? `-${variant}` : '';
  return `${categoryCode}${timestamp}${random}${variantPart}`;
};

/**
 * Genera un número de factura
 */
const generateInvoiceNumber = (prefix, sequence) => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(8, '0');
  return `${prefix}-${year}${month}-${seq}`;
};

/**
 * Calcula impuestos
 */
const calculateTax = (subtotal, taxRate) => {
  return Math.round(subtotal * taxRate * 100) / 100;
};

/**
 * Calcula descuento
 */
const calculateDiscount = (subtotal, discountPercent) => {
  return Math.round(subtotal * (discountPercent / 100) * 100) / 100;
};

/**
 * Formatea moneda
 */
const formatCurrency = (amount, currency = 'COP') => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Pagina resultados
 */
const paginate = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = data.length;
  const totalPages = Math.ceil(total / limit);

  return {
    data: data.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: endIndex < total,
      hasPrevPage: startIndex > 0
    }
  };
};

/**
 * Extrae información del user-agent
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent) return {};
  return {
    browser: userAgent,
    isMobile: /mobile|android|iphone|ipad/i.test(userAgent),
    isBot: /bot|crawler|spider/i.test(userAgent)
  };
};

/**
 * Obtiene la IP real del cliente
 */
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.ip || 
         req.connection?.remoteAddress;
};

/**
 * Filtra campos sensibles de un objeto
 */
const filterSensitiveFields = (obj, fields = ['password', 'token', 'secret']) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const filtered = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key of Object.keys(filtered)) {
    if (fields.includes(key)) {
      delete filtered[key];
    } else if (typeof filtered[key] === 'object') {
      filtered[key] = filterSensitiveFields(filtered[key], fields);
    }
  }
  
  return filtered;
};

/**
 * Convierte un string a boolean
 */
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'si', 'sí'].includes(value.toLowerCase());
  }
  return false;
};

module.exports = {
  sanitizeText,
  sanitizeObject,
  generateSKU,
  generateInvoiceNumber,
  calculateTax,
  calculateDiscount,
  formatCurrency,
  paginate,
  parseUserAgent,
  getClientIp,
  filterSensitiveFields,
  toBoolean
};
