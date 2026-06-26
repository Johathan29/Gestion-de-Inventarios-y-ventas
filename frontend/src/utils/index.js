import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Formatear moneda (COP)
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
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
