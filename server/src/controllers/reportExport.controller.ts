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
      res.status(503).json({ success: false, message: 'Report export modules not installed. Please run: npm install exceljs pdfkit (in the server folder).', code: 'EXPORT_DEPS_MISSING' });
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

    // PDF fallback
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileBase}.pdf`);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(18).text(`${capitalize(kind)} Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Date range: ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`);
    doc.moveDown();
    // Simple table header
    doc.font('Helvetica-Bold');
    doc.text(columns.map(c => c.header).join('  |  '));
    doc.font('Helvetica');
    rows.forEach((r) => {
      const line = columns.map(c => String(r[c.key] ?? '')).join('  |  ');
      doc.text(line);
    });
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
