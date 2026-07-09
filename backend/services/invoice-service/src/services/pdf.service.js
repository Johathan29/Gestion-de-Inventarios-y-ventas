// ============================================================
// PDF Generation Service — Invoice PDF with QR
// ============================================================

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const COMPANY = {
  name: process.env.INVOICE_COMPANY_NAME || 'Tu Empresa S.A.',
  nit: process.env.INVOICE_COMPANY_NIT || '123456789',
  address: process.env.INVOICE_COMPANY_ADDRESS || 'Calle Principal #123',
  phone: process.env.INVOICE_COMPANY_PHONE || '+57 300 123 4567',
  email: process.env.INVOICE_COMPANY_EMAIL || 'contacto@tuempresa.com',
  currency: process.env.INVOICE_CURRENCY || 'COP',
  taxRate: parseFloat(process.env.INVOICE_TAX_RATE) || 0.19,
};

export class InvoicePdfService {
  async generate(invoice) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    await this._buildPdf(doc, invoice);
    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });
  }

  async _buildPdf(doc, invoice) {
    // Colors
    const primaryColor = '#1a237e';
    const secondaryColor = '#424242';
    const accentColor = '#e8eaf6';
    const borderColor = '#bdbdbd';

    // === HEADER ===
    doc.fontSize(22).font('Helvetica-Bold').fillColor(primaryColor)
      .text(COMPANY.name, 50, 50, { align: 'left' });

    doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
      .text(COMPANY.address, 50, 78)
      .text(`Tel: ${COMPANY.phone}  |  Email: ${COMPANY.email}`, 50, 93)
      .text(`NIT: ${COMPANY.nit}`, 50, 108);

    // Invoice title
    doc.fontSize(18).font('Helvetica-Bold').fillColor(primaryColor)
      .text('FACTURA', 300, 50, { align: 'right' });

    doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
      .text(`No. ${invoice.invoiceNumber || ''}`, { align: 'right' });

    if (invoice.ncf) {
      doc.text(`NCF: ${invoice.ncf}`, { align: 'right' });
    }

    // Separator line
    doc.moveTo(50, 130).lineTo(545, 130).strokeColor(borderColor).stroke();

    // === CLIENT INFO ===
    doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor)
      .text('DATOS DEL CLIENTE', 50, 145);

    doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
      .text(`Nombre: ${invoice.clientName || 'Cliente General'}`, 50, 165)
      .text(`Documento: ${invoice.clientDocumentType || ''} ${invoice.clientDocumentNumber || ''}`, 50, 180)
      .text(`Dirección: ${invoice.clientAddress || ''}`, 50, 195);

    if (invoice.clientPhone || invoice.clientEmail) {
      doc.text(`Tel/Email: ${invoice.clientPhone || ''} ${invoice.clientEmail || ''}`, 50, 210);
    }

    // Invoice metadata right side
    const metaX = 320;
    doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
      .text(`Fecha Emisión: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : ''}`, metaX, 165)
      .text(`Fecha Vencimiento: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}`, metaX, 180);

    if (invoice.paymentMethodName) {
      doc.text(`Método de Pago: ${invoice.paymentMethodName}`, metaX, 195);
    }

    // Separator
    doc.moveTo(50, 230).lineTo(545, 230).strokeColor(borderColor).stroke();

    // === TABLE HEADER ===
    const tableTop = 245;
    const colWidths = [30, 180, 60, 60, 60, 60, 80];
    const headers = ['#', 'Producto', 'Cant.', 'P.Unit', 'Desc.', 'IVA', 'Total'];

    // Header background
    doc.rect(50, tableTop - 5, 495, 20).fill(accentColor);

    let xPos = 50;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor);
    headers.forEach((header, i) => {
      doc.text(header, xPos + 3, tableTop, {
        width: colWidths[i] - 6,
        align: i === 0 ? 'center' : i >= 2 ? 'right' : 'left',
      });
      xPos += colWidths[i];
    });

    // === TABLE ROWS ===
    let yPos = tableTop + 25;
    doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);

    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, index) => {
        if (yPos > 720) {
          doc.addPage();
          yPos = 50;
        }

        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(50, yPos - 5, 495, 20).fillColor('#f5f5f5').fill();
        }

        doc.fillColor(secondaryColor);
        xPos = 50;
        const rowData = [
          String(index + 1),
          item.productName || '',
          String(item.quantity || 0),
          `$${(item.unitPrice || 0).toFixed(2)}`,
          `$${(item.discount || 0).toFixed(2)}`,
          `$${(item.tax || 0).toFixed(2)}`,
          `$${(item.total || 0).toFixed(2)}`,
        ];

        rowData.forEach((text, i) => {
          doc.text(text, xPos + 3, yPos, {
            width: colWidths[i] - 6,
            align: i === 0 ? 'center' : i >= 2 ? 'right' : 'left',
          });
          xPos += colWidths[i];
        });

        yPos += 22;
      });
    } else {
      doc.text('No hay items en esta factura', 50, yPos);
      yPos += 22;
    }

    // === TOTALS ===
    const totalsX = 350;
    const totalsY = Math.max(yPos + 10, 500);
    const lineH = 18;

    doc.fontSize(10).font('Helvetica');
    const drawTotalLine = (label, value, y, bold = false, border = false) => {
      if (border) {
        doc.moveTo(totalsX - 10, y - 2).lineTo(545, y - 2).strokeColor(borderColor).stroke();
      }
      if (bold) doc.font('Helvetica-Bold');
      else doc.font('Helvetica');
      doc.fillColor(secondaryColor).text(label, totalsX - 10, y);
      doc.fillColor(primaryColor).text(`$${(value || 0).toFixed(2)}`, totalsX + 80, y, { align: 'right', width: 115 });
    };

    drawTotalLine('Subtotal:', invoice.subtotal, totalsY);
    drawTotalLine('Descuento:', invoice.discount, totalsY + lineH);
    drawTotalLine('IVA (19%):', invoice.tax, totalsY + lineH * 2);
    drawTotalLine('TOTAL:', invoice.total, totalsY + lineH * 3, true, true);

    // === QR CODE ===
    if (invoice.qrCodeText || invoice.invoiceNumber) {
      try {
        const qrData = invoice.qrCodeText || JSON.stringify({
          invoice: invoice.invoiceNumber,
          ncf: invoice.ncf,
          total: invoice.total,
          date: invoice.createdAt,
        });
        const qrBuffer = await this._generateQr(qrData);

        const qrY = Math.max(totalsY, 420);
        doc.image(qrBuffer, 50, qrY, { width: 100 });
        doc.fontSize(7).font('Helvetica').fillColor(secondaryColor)
          .text('Escanee para verificar', 50, qrY + 105);
      } catch (e) {
        console.error('QR generation error:', e.message);
      }
    }

    // === FOOTER ===
    doc.fontSize(8).font('Helvetica').fillColor('#9e9e9e')
      .text('Documento generado electrónicamente', 50, 760, { align: 'center' });
  }

  async _generateQr(data) {
    return QRCode.toBuffer(data, {
      width: 200,
      margin: 2,
      color: { dark: '#1a237e', light: '#ffffff' },
    });
  }
}
