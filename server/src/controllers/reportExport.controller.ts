import { Request, Response } from 'express';
import { Sale } from '../models/Sale.model';
import { Product } from '../models/Product.model';
import { Customer } from '../models/Customer.model';
import { PurchaseOrder } from '../models/PurchaseOrder.model';
import { StockMovement } from '../models/StockMovement.model';

type ExportFormat = 'excel' | 'pdf';
type ReportKind = 'sales' | 'inventory' | 'customers' | 'suppliers' | 'profitloss' | 'stock';

export const exportReport = async (req: Request, res: Response): Promise<void> => {
  try {
    // Lazy load to avoid startup crash if deps aren't installed yet
    const loadModule = (name: string): any | undefined => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(name);
      } catch (err) {
        console.warn(`[reports/export] Missing optional dependency: ${name}`, err);
        return undefined;
      }
    };
    const ExcelJS = loadModule('exceljs');
    const PDFDocument = loadModule('pdfkit');
    if (!ExcelJS || !PDFDocument) {
      res.status(503).json({ success: false, message: 'Report export modules not installed on server. Please install exceljs and pdfkit.', code: 'EXPORT_DEPS_MISSING' });
      return;
    }
    const { type, format, startDate, endDate } = req.query as any;
    const kind = String(type || '').toLowerCase() as ReportKind;
    const fmt = String(format || 'excel').toLowerCase() as ExportFormat;
    if (!['sales', 'inventory', 'customers', 'suppliers', 'profitloss', 'stock'].includes(kind)) {
      res.status(400).json({ success: false, message: 'Invalid report type' });
      return;
    }

    const start = startDate ? new Date(String(startDate)) : new Date(0);
    const end = endDate ? new Date(String(endDate)) : new Date();

    // Build dataset per report type
    let columns: { header: string; key: string; width?: number }[] = [];
    let rows: any[] = [];

    if (kind === 'sales') {
      const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } })
        .populate('customer', 'name customerCode')
        .lean();
      columns = [
        { header: 'Date', key: 'date', width: 18 },
        { header: 'Invoice No', key: 'invoiceNo', width: 18 },
        { header: 'Customer', key: 'customer', width: 28 },
        { header: 'Items', key: 'items', width: 10 },
        { header: 'Revenue (LKR)', key: 'total', width: 18 },
        { header: 'COGS (LKR)', key: 'cogs', width: 18 },
        { header: 'Profit (LKR)', key: 'profit', width: 18 },
      ];
      rows = sales.map((s: any) => {
        const cogs = (s.items || []).reduce((sum: number, it: any) => sum + ((it.cost || 0) * (it.quantity || 0)), 0);
        const profit = (s.total || 0) - cogs;
        return {
          date: new Date(s.createdAt).toISOString().slice(0, 19).replace('T', ' '),
          invoiceNo: s.invoiceNo || s._id?.toString().slice(-6),
          customer: s.customer?.name || 'Walk-in',
          items: (s.items || []).reduce((n: number, it: any) => n + (it.quantity || 0), 0),
          total: s.total || 0,
          cogs,
          profit,
        };
      });
    }

    if (kind === 'inventory') {
      const products = await Product.find({}).populate('category', 'name').lean();
      columns = [
        { header: 'SKU', key: 'sku', width: 16 },
        { header: 'Product', key: 'name', width: 32 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'Cost (LKR)', key: 'cost', width: 14 },
        { header: 'Retail (LKR)', key: 'retail', width: 14 },
        { header: 'Inventory Value (LKR)', key: 'value', width: 20 },
      ];
      rows = products.map((p: any) => ({
        sku: p.sku,
        name: p.name?.en || p.name,
        category: p.category?.name?.en || p.category?.name || '—',
        stock: p.stock?.current || 0,
        cost: p.price?.cost || 0,
        retail: p.price?.retail || 0,
        value: (p.stock?.current || 0) * (p.price?.cost || 0),
      }));
    }

    if (kind === 'customers') {
      const customers = await Customer.find({}).lean();
      // Simple totals from sales
      const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } }).lean();
      const totalsByCustomer = new Map<string, { total: number; orders: number }>();
      sales.forEach((s: any) => {
        const key = String(s.customer || 'walkin');
        const prev = totalsByCustomer.get(key) || { total: 0, orders: 0 };
        prev.total += s.total || 0;
        prev.orders += 1;
        totalsByCustomer.set(key, prev);
      });
      columns = [
        { header: 'Customer', key: 'customer', width: 28 },
        { header: 'Type', key: 'type', width: 14 },
        { header: 'Orders', key: 'orders', width: 12 },
        { header: 'Revenue (LKR)', key: 'revenue', width: 18 },
        { header: 'Avg Order (LKR)', key: 'aov', width: 18 },
      ];
      rows = customers.map((c: any) => {
        const agg = totalsByCustomer.get(String(c._id)) || { total: 0, orders: 0 };
        return {
          customer: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
          type: c.type || 'regular',
          orders: agg.orders,
          revenue: agg.total,
          aov: agg.orders > 0 ? agg.total / agg.orders : 0,
        };
      });
    }

    if (kind === 'suppliers') {
      const pos = await PurchaseOrder.find({ orderDate: { $gte: start, $lte: end } })
        .populate('supplier', 'name supplierCode')
        .lean();
      columns = [
        { header: 'Supplier', key: 'supplier', width: 28 },
        { header: 'PO #', key: 'po', width: 14 },
        { header: 'Order Date', key: 'date', width: 18 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Total (LKR)', key: 'total', width: 16 },
      ];
      rows = pos.map((po: any) => ({
        supplier: po.supplier?.name || '—',
        po: po.orderNumber || po._id?.toString().slice(-6),
        date: new Date(po.orderDate).toISOString().slice(0, 10),
        status: po.status || '—',
        total: po.total || 0,
      }));
    }

    if (kind === 'profitloss') {
      const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } }).lean();
      const purchases = await PurchaseOrder.find({ orderDate: { $gte: start, $lte: end } }).lean();
      const totalRevenue = sales.reduce((s, v: any) => s + (v.total || 0), 0);
      const totalCOGS = sales.reduce((s, v: any) => s + (v.items || []).reduce((x: number, it: any) => x + ((it.cost || 0) * (it.quantity || 0)), 0), 0);
      const totalPurchases = purchases.reduce((s, v: any) => s + (v.total || 0), 0);
      const grossProfit = totalRevenue - totalCOGS;
      columns = [
        { header: 'Metric', key: 'metric', width: 24 },
        { header: 'Amount (LKR)', key: 'amount', width: 20 },
      ];
      rows = [
        { metric: 'Revenue', amount: totalRevenue },
        { metric: 'COGS', amount: totalCOGS },
        { metric: 'Purchases', amount: totalPurchases },
        { metric: 'Gross Profit', amount: grossProfit },
      ];
    }

    if (kind === 'stock') {
      const moves = await StockMovement.find({ createdAt: { $gte: start, $lte: end } })
        .populate('product', 'name sku')
        .lean();
      columns = [
        { header: 'Date', key: 'date', width: 18 },
        { header: 'Type', key: 'type', width: 14 },
        { header: 'SKU', key: 'sku', width: 16 },
        { header: 'Product', key: 'product', width: 32 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Ref', key: 'ref', width: 18 },
      ];
      rows = moves.map((m: any) => ({
        date: new Date(m.createdAt).toISOString().slice(0, 19).replace('T', ' '),
        type: m.type,
        sku: m.product?.sku,
        product: m.product?.name?.en || m.product?.name,
        quantity: m.quantity,
        ref: m.reference || '—',
      }));
    }

    const fileBase = `${kind}-report-${new Date().toISOString().slice(0, 10)}`;

    if (fmt === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Report');
      ws.columns = columns as any;
      ws.addRows(rows);
      ws.getRow(1).font = { bold: true };
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileBase}.xlsx`);
      await wb.xlsx.write(res);
      res.end();
      return;
    }

    // Elegant PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileBase}.pdf`);
    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    doc.on('error', () => { try { res.end(); } catch {} });
    doc.pipe(res);

    // Header
    const title = `${capitalize(kind)} Report`;
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(20).text(title, { align: 'left' });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).fillColor('#666666')
      .text(`Date range: ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`);

    // Divider
    doc.moveDown(0.6);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.6);

    // Optional summary for sales/profitloss kinds
    if ((kind === 'sales' || kind === 'profitloss') && rows.length > 0) {
      try {
        const sum = (key: string) => rows.reduce((s: number, r: any) => s + (Number(r[key]) || 0), 0);
        const toLKR = (n: number) => `LKR ${Math.round(Number(n || 0)).toLocaleString('en-LK')}`;
        const summaryPairs: Array<{ label: string; value: string }> = [];
        if (kind === 'sales') {
          summaryPairs.push(
            { label: 'Orders', value: String(rows.length) },
            { label: 'Revenue', value: toLKR(sum('total')) },
            { label: 'COGS', value: toLKR(sum('cogs')) },
            { label: 'Profit', value: toLKR(sum('profit')) },
          );
        } else {
          const get = (label: string) => {
            const row = rows.find((r: any) => String(r.metric).toLowerCase() === label);
            return toLKR(row?.amount || 0);
          };
          summaryPairs.push(
            { label: 'Revenue', value: get('revenue') },
            { label: 'COGS', value: get('cogs') },
            { label: 'Purchases', value: get('purchases') },
            { label: 'Gross Profit', value: get('gross profit') },
          );
        }
        // Render summary chips
        const chipH = 22;
        const gap = 8;
        let x = doc.page.margins.left;
        const y = doc.y;
        summaryPairs.forEach((p) => {
          const label = `${p.label}: ${p.value}`;
          const w = doc.widthOfString(label) + 16;
          doc.roundedRect(x, y, w, chipH, 6).fillAndStroke('#f3f4f6', '#e5e7eb');
          doc.fillColor('#111111').font('Helvetica').fontSize(10).text(label, x + 8, y + 6, { width: w - 16, lineBreak: false });
          x += w + gap;
        });
        doc.moveDown(2);
      } catch {}
    }

    // Helpers
    const clipToWidth = (s: string, max: number) => {
      if (!s) return '';
      let out = String(s).replace(/\n+/g, ' ');
      while (doc.widthOfString(out) > max && out.length > 1) {
        out = out.slice(0, -1);
      }
      if (out.length < String(s).length && max > doc.widthOfString('…')) {
        while (doc.widthOfString(out + '…') > max && out.length > 1) out = out.slice(0, -1);
        out = out + '…';
      }
      return out;
    };
    const asDate = (value: any) => {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value ?? '');
      return d.toISOString().slice(0, 10);
    };

    // Table renderer
    const startY = doc.y;
    const colPadding = 8;
    const widths = columns.map((c) => Math.max(c.width || 14, Math.ceil(doc.widthOfString(c.header) / 5) * 5));
    const totalFlex = widths.reduce((a, b) => a + b, 0);
    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const scale = pageW / totalFlex;
    const scaled = widths.map((w) => Math.max(60, w * scale));

    // Header row (fixed height, no wrap)
    let x = doc.page.margins.left;
    let y = startY;
    const headerH = 24;
    doc.save();
    doc.fillColor('#111827');
    doc.roundedRect(x - 1, y - 2, pageW + 2, headerH + 4, 6).fill('#f3f4f6');
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(10);
    columns.forEach((c, i) => {
      const w = scaled[i] - colPadding * 2;
      const header = clipToWidth(String(c.header), w);
      doc.text(header, x + colPadding, y + 6, { width: w, lineBreak: false });
      x += scaled[i];
    });
    doc.restore();
    y += headerH;

    // Body rows with zebra striping
    doc.font('Helvetica').fontSize(10).fillColor('#111111');
    rows.forEach((r, rowIdx) => {
      x = doc.page.margins.left;
      const rowH = 20;
      if (rowIdx % 2 === 0) {
        doc.save();
        doc.roundedRect(x - 1, y - 2, pageW + 2, rowH + 4, 4).fill('#ffffff');
        doc.restore();
      }
      columns.forEach((c, i) => {
        const raw = r[c.key];
        let txt: string;
        if (c.key === 'date') txt = asDate(raw);
        else if (typeof raw === 'number') txt = `LKR ${Math.round(raw).toLocaleString('en-LK')}`;
        else txt = String(raw ?? '');
        const maxW = scaled[i] - colPadding * 2;
        const clipped = clipToWidth(txt, maxW);
        const numeric = typeof raw === 'number' || ['items', 'quantity'].includes(c.key);
        doc.text(clipped, x + colPadding, y + 5, { width: maxW, align: numeric ? 'right' : 'left', lineBreak: false });
        x += scaled[i];
      });
      y += rowH;
      if (y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    });

    // Footer
    doc.moveDown(1);
    doc.fontSize(8).fillColor('#6b7280').text('Generated by VoltZone POS', { align: 'right' });
    doc.end();
    return;
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ success: false, message: 'Failed to export report' });
    return;
  }
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
