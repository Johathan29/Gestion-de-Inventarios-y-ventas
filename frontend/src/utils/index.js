import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── CONSTANTES DE FORMATO COMPACTO ─────────────────────────
const MILLION = 1_000_000;
const BILLION = 1_000_000_000;

/**
 * Formatea un valor numérico como moneda.
 * @param {number} value - El valor a formatear
 * @param {object} [options] - Opciones de formato
 * @param {boolean} [options.compact=false] - Si es true, muestra millones como "1.5M", etc.
 * @param {string} [options.currency='COP'] - Código de moneda (USD, COP, EUR, etc.)
 * @param {string} [options.locale='es-CO'] - Locale para formato numérico
 * @returns {string} Valor formateado como moneda
 *
 * @example
 * formatCurrency(1500000)                    // → "$1.500.000" (COP legacy)
 * formatCurrency(1500000, { compact: true }) // → "$1.5M"
 * formatCurrency(50, { currency: 'USD', locale: 'en-US' }) // → "$50"
 */
export const formatCurrency = (value, options = {}) => {
  if (value === null || value === undefined) return '$0';

  const {
    compact = false,
    currency: currencyCode = 'COP',
    locale = 'es-CO',
  } = options;

  // ── Formato compacto para millones / billones ──
  if (compact && Math.abs(value) >= MILLION) {
    const abs = Math.abs(value);
    let compactValue, suffix;
    if (abs >= BILLION) {
      compactValue = value / BILLION;
      suffix = 'B';
    } else {
      compactValue = value / MILLION;
      suffix = 'M';
    }
    // Extraer el símbolo de la moneda desde Intl
    const symbol = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0).replace(/[\d,.\s]/g, '').trim() || '$';

    const numFormatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(compactValue);

    return `${symbol}${numFormatted}${suffix}`;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Formatea un número con soporte para formato compacto (millones, billones).
 * Útil para cantidades grandes como conteo de productos, visitas, etc.
 * @param {number} value - El valor a formatear
 * @param {object} [options] - Opciones de formato
 * @param {boolean} [options.compact=false] - Si es true, muestra millones como "1.5M"
 * @param {string} [options.locale='es-CO'] - Locale para formato numérico
 * @returns {string} Número formateado
 *
 * @example
 * formatNumber(1500)               // → "1.500"
 * formatNumber(2500000, { compact: true }) // → "2.5M"
 */
export const formatNumber = (value, options = {}) => {
  if (value === null || value === undefined) return '0';

  const { compact = false, locale = 'es-CO' } = options;

  if (compact && Math.abs(value) >= MILLION) {
    const abs = Math.abs(value);
    let compactValue, suffix;
    if (abs >= BILLION) {
      compactValue = value / BILLION;
      suffix = 'B';
    } else {
      compactValue = value / MILLION;
      suffix = 'M';
    }
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(compactValue) + suffix;
  }

  return new Intl.NumberFormat(locale).format(value);
};

// Formatear fecha
export const formatDate = (date) => {
  if (!date) return '';
  return format(parseISO(date), 'dd/MM/yyyy', { locale: es });
};

// Formatear fecha y hora
export const formatDateTime = (date) => {
  if (!date) return '';
  return format(parseISO(date), 'dd/MM/yyyy HH:mm', { locale: es });
};

// Formatear fecha relativa
export const formatRelativeTime = (date) => {
  if (!date) return '';
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: es });
};

// Obtener color según estado
export const getStatusColor = (status) => {
  const colors = {
    active: 'green',
    inactive: 'gray',
    pending: 'yellow',
    approved: 'blue',
    received: 'green',
    cancelled: 'red',
    completed: 'green',
    refunded: 'orange',
    issued: 'blue',
    paid: 'green',
    voided: 'red',
    out_of_stock: 'red',
    low_stock: 'orange',
    in_stock: 'green'
  };
  return colors[status] || 'gray';
};

// Traducir estado
export const getStatusLabel = (status) => {
  const labels = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    approved: 'Aprobado',
    received: 'Recibido',
    cancelled: 'Cancelado',
    completed: 'Completado',
    refunded: 'Reembolsado',
    issued: 'Emitida',
    paid: 'Pagada',
    voided: 'Anulada',
    out_of_stock: 'Sin Stock',
    low_stock: 'Stock Bajo',
    in_stock: 'En Stock',
    discontinued: 'Descontinuado',
    draft: 'Borrador',
    sent: 'Enviado',
    failed: 'Fallido'
  };
  return labels[status] || status;
};

// Número de factura/venta formateado
export const formatInvoiceNumber = (num) => num || 'N/A';

// ============================================================
// NORMALIZACIÓN DE DATOS BACKEND -> FRONTEND
// ============================================================

/**
 * Normaliza una venta desde el backend (real) al formato esperado por el frontend
 * El backend devuelve: sale_number, clients?.name, users?.name, payment_method
 * El frontend espera:  invoice_number, client_name, user_name, payment_type
 */
export const normalizeSale = (sale) => {
  if (!sale) return sale;
  return {
    ...sale,
    invoice_number: sale.sale_number || sale.invoice_number,
    client_name: sale.clients?.name || sale.client_name || 'Cliente General',
    user_name: sale.users?.name || sale.user_name || '-',
    payment_type: sale.payment_method || sale.payment_type || '-'
  };
};

/**
 * Normaliza un array de ventas
 */
export const normalizeSales = (sales) => (sales || []).map(normalizeSale);

/**
 * Normaliza una factura (invoice) desde el backend al formato esperado por frontend
 */
export const normalizeInvoice = (inv) => {
  if (!inv) return inv;
  return {
    ...inv,
    client_name: inv.clients?.name || inv.client_name || 'Cliente General'
  };
};

export const normalizeInvoices = (invoices) => (invoices || []).map(normalizeInvoice);

/**
 * Normaliza un ítem de inventario desde el backend (hexagonal) al formato esperado por frontend
 * El backend devuelve: minStock, unitCost, totalCost, product.min_stock, product.name, product.sku
 * El frontend espera:  min_stock, purchase_price, cost_price, product.name, product.sku
 */
export const normalizeInventoryItem = (item) => {
  if (!item) return item;
  return {
    ...item,
    // Flatten product nested object
    product_name: item.product_name ?? item.product?.name ?? '-',
    sku: item.sku ?? item.product?.sku ?? '-',
    product_id: item.product_id ?? item.productId ?? item.product?.id ?? null,
    // Flatten camelCase to snake_case
    min_stock: item.min_stock ?? item.product?.min_stock ?? item.minStock ?? 0,
    purchase_price: item.purchase_price ?? item.cost_price ?? item.unitCost ?? 0,
    cost_price: item.cost_price ?? item.unitCost ?? 0,
    price: item.price ?? item.product?.price ?? 0,
  };
};

export const normalizeInventoryItems = (items) => (items || []).map(normalizeInventoryItem);

// Obtener iniciales del nombre
export const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Truncar texto
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '...';
};

// Clase CSS para estado
export const statusClass = (status) => {
  const map = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    received: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    refunded: 'bg-orange-100 text-orange-800',
    issued: 'bg-primary-100 text-primary-800',
    paid: 'bg-green-100 text-green-800',
    voided: 'bg-red-100 text-red-800',
    out_of_stock: 'bg-red-100 text-red-800',
    low_stock: 'bg-orange-100 text-orange-800',
    in_stock: 'bg-green-100 text-green-800',
    discontinued: 'bg-gray-100 text-gray-800'
  };
  return map[status] || 'bg-gray-100 text-gray-800';
};

// Exportar a CSV
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h]?.toString() || '';
      return val.includes(',') ? `"${val}"` : val;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
