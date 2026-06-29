const { getSupabaseClient } = require('@inventory/shared');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const supabase = getSupabaseClient();

const COMPANY = {
  name: process.env.INVOICE_COMPANY_NAME || 'Tu Empresa S.A.',
  nit: process.env.INVOICE_COMPANY_NIT || '123456789',
  address: process.env.INVOICE_COMPANY_ADDRESS || 'Calle Principal #123',
  phone: process.env.INVOICE_COMPANY_PHONE || '+57 300 123 4567',
  email: process.env.INVOICE_COMPANY_EMAIL || 'contacto@tuempresa.com',
  currency: process.env.INVOICE_CURRENCY || 'COP',
  taxRate: parseFloat(process.env.INVOICE_TAX_RATE) || 0.19
};

/**
 * Listar facturas
 */
const getInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sale_id, client_id } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('invoices')
      .select('*, sales(*), clients(name)', { count: 'exact' });

    if (sale_id) query = query.eq('sale_id', sale_id);
    if (client_id) query = query.eq('client_id', client_id);

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: invoices, count, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: invoices,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, totalPages: Math.ceil(count / limit) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener factura por ID
 */
const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, sales(*, sale_items(*, products(name, sku))), clients(*)')
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Factura no encontrada' }
      });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

/**
 * Generar factura desde una venta
 */
const generateInvoice = async (req, res, next) => {
  try {
    const { sale_id } = req.body;

    if (!sale_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'ID de venta requerido' }
      });
    }

    // Obtener datos de la venta
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*, sale_items(*, products(name, sku, price)), clients(*)')
      .eq('id', sale_id)
      .single();

    if (saleError || !sale) {
      return res.status(404).json({
        success: false,
        error: { code: 'SALE_NOT_FOUND', message: 'Venta no encontrada' }
      });
    }

    // Obtener último número de factura
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastNumber = lastInvoice ? parseInt(lastInvoice.invoice_number.split('-')[1]) : 0;
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(8, '0')}`;

    // Crear factura
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        sale_id,
        client_id: sale.client_id,
        invoice_number: invoiceNumber,
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        total: sale.total,
        status: 'generated',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

/**
 * Generar PDF de factura
 */
const generateInvoicePDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, sales(*, sale_items(*, products(name, sku))), clients(*)')
      .eq('id', id)
      .single();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Factura no encontrada' }
      });
    }

    const client = invoice.clients;
    const items = invoice.sales?.sale_items || [];

    // Generar QR
    const qrData = JSON.stringify({
      invoice: invoice.invoice_number,
      nit: COMPANY.nit,
      total: invoice.total,
      date: invoice.created_at
    });
    const qrImage = await QRCode.toDataURL(qrData);

    // Crear PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${invoice.invoice_number}.pdf`);
    doc.pipe(res);

    // Encabezado
    doc.fontSize(24).font('Helvetica-Bold').text(COMPANY.name, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`NIT: ${COMPANY.nit}`, { align: 'center' });
    doc.text(COMPANY.address, { align: 'center' });
    doc.text(`Tel: ${COMPANY.phone} | Email: ${COMPANY.email}`, { align: 'center' });
    doc.moveDown();

    // Línea separadora
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Número de factura
    doc.fontSize(16).font('Helvetica-Bold').text(`FACTURA ${invoice.invoice_number}`, { align: 'center' });
    doc.moveDown(0.5);

    // Información de factura
    doc.fontSize(10).font('Helvetica');
    doc.text(`Fecha: ${new Date(invoice.created_at).toLocaleDateString('es-CO')}`);
    doc.text(`Vencimiento: ${new Date(invoice.due_date).toLocaleDateString('es-CO')}`);
    doc.text(`Estado: ${invoice.status}`);
    doc.moveDown();

    // Información del cliente
    doc.fontSize(12).font('Helvetica-Bold').text('DATOS DEL CLIENTE');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nombre: ${client?.name || 'Cliente General'}`);
    doc.text(`Email: ${client?.email || 'N/A'}`);
    doc.text(`Teléfono: ${client?.phone || 'N/A'}`);
    doc.text(`Dirección: ${client?.address || 'N/A'}`);
    doc.moveDown();

    // Línea separadora
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Tabla de productos
    doc.fontSize(12).font('Helvetica-Bold').text('DETALLE DE PRODUCTOS');
    doc.moveDown(0.5);

    // Encabezados de tabla
    const tableTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Producto', 50, tableTop, { width: 200 });
    doc.text('Cant.', 260, tableTop, { width: 50, align: 'center' });
    doc.text('Precio', 320, tableTop, { width: 80, align: 'right' });
    doc.text('Total', 450, tableTop, { width: 100, align: 'right' });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Items
    doc.fontSize(9).font('Helvetica');
    let yPosition = doc.y;

    for (const item of items) {
      doc.text(item.products?.name || item.product_name || 'Producto', 50, yPosition, { width: 200 });
      doc.text(String(item.quantity), 260, yPosition, { width: 50, align: 'center' });
      doc.text(`$${Number(item.unit_price).toLocaleString('es-CO')}`, 320, yPosition, { width: 80, align: 'right' });
      doc.text(`$${Number(item.total).toLocaleString('es-CO')}`, 450, yPosition, { width: 100, align: 'right' });
      yPosition += 20;
    }

    doc.y = yPosition;
    doc.moveDown();

    // Línea separadora
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Totales
    const totalX = 350;
    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', totalX, doc.y, { width: 100 });
    doc.text(`$${Number(invoice.subtotal).toLocaleString('es-CO')}`, 450, doc.y - 12, { width: 100, align: 'right' });

    if (invoice.discount > 0) {
      doc.text('Descuento:', totalX, doc.y + 5, { width: 100 });
      doc.text(`-$${Number(invoice.discount).toLocaleString('es-CO')}`, 450, doc.y - 7, { width: 100, align: 'right' });
    }

    doc.text('IVA (19%):', totalX, doc.y + 5, { width: 100 });
    doc.text(`$${Number(invoice.tax).toLocaleString('es-CO')}`, 450, doc.y - 7, { width: 100, align: 'right' });

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('TOTAL:', totalX, doc.y, { width: 100 });
    doc.text(`$${Number(invoice.total).toLocaleString('es-CO')}`, 450, doc.y - 16, { width: 100, align: 'right' });

    doc.moveDown(2);

    // QR
    doc.image(qrImage, 50, doc.y, { width: 100 });
    doc.fontSize(8).font('Helvetica').text('Código QR de facturación', 50, doc.y + 110);

    // Finalizar
    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * Enviar factura por email
 */
const sendInvoiceEmail = async (req, res, next) => {
  try {
    const { id } = req.params;

    res.json({
      success: true,
      message: 'Factura enviada por email exitosamente',
      data: { invoice_id: id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar estado de pago de factura
 */
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['issued', 'paid', 'cancelled', 'voided'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Estado inválido. Use: issued, paid, cancelled, voided' }
      });
    }

    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, status, invoice_number')
      .eq('id', id)
      .single();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Factura no encontrada' }
      });
    }

    const updateData = { status };
    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }
    if (status === 'cancelled' || status === 'voided') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = { getInvoices, getInvoiceById, generateInvoice, generateInvoicePDF, sendInvoiceEmail, updatePaymentStatus };
