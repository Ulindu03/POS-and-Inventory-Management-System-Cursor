import { Request, Response, NextFunction } from 'express';
import { Sale } from '../models/Sale.model';
import { Product } from '../models/Product.model';
import { User } from '../models/User.model';

const nextInvoiceNo = async (): Promise<string> => {
  const last = await Sale.findOne().sort({ createdAt: -1 }).select('invoiceNo');
  const n = last?.invoiceNo?.match(/(\d+)$/)?.[1];
  const next = (n ? parseInt(n, 10) + 1 : 1).toString().padStart(6, '0');
  return `INV-${next}`;
};

export class SaleController {
  static async create(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { items, payment, discount = 0, customer } = req.body as any;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items' });
      }

      const productIds = items.map((i) => i.product);
      const products = await Product.find({ _id: { $in: productIds } }).select('price.cost price.retail stock.current');
      const costMap = new Map(products.map((p) => [p._id.toString(), p.price.cost || 0]));

      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const vat = 0; // simplified
      const nbt = 0; // simplified
      const total = Math.max(0, subtotal + vat + nbt - discount);

      const invoiceNo = await nextInvoiceNo();
      const cashierId = req.user?.userId || (await User.findOne().select('_id'))?._id; // fallback

      const doc = await Sale.create({
        invoiceNo,
        customer: customer || null,
        cashier: cashierId,
        items: items.map((i: any) => ({
          product: i.product,
          quantity: i.quantity,
          price: i.price,
          cost: costMap.get(i.product) || 0,
          discount: i.discount || 0,
          tax: { vat: 0, nbt: 0 },
          total: i.price * i.quantity - (i.discount || 0),
        })),
        subtotal,
        tax: { vat, nbt },
        discount,
        total,
        payment,
        status: 'completed',
      });

      res.status(201).json({ success: true, data: { sale: { id: doc._id, invoiceNo: doc.invoiceNo, total: doc.total } } });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const sale = await Sale.findById(id).populate('items.product', 'sku name price');
      if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
      res.json({ success: true, data: { sale } });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', q } = req.query as Record<string, string>;
      const take = Math.min(parseInt(limit, 10) || 20, 100);
      const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
      const filters: any = {};
      if (q) {
        filters.$or = [
          { invoiceNo: { $regex: q, $options: 'i' } },
        ];
      }
      const [items, total] = await Promise.all([
        Sale.find(filters)
          .select('invoiceNo total createdAt cashier')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(take),
        Sale.countDocuments(filters),
      ]);
      res.json({ success: true, data: { items, total, page: parseInt(page, 10) || 1, limit: take } });
    } catch (err) {
      next(err);
    }
  }

  static async hold(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { items, discount = 0, customer, note } = req.body as any;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items' });
      }
      const invoiceNo = await nextInvoiceNo();
      const cashierId = req.user?.userId || (await User.findOne().select('_id'))?._id;
      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const total = Math.max(0, subtotal - discount);
      const doc = await Sale.create({
        invoiceNo,
        customer: customer || null,
        cashier: cashierId,
        items: items.map((i: any) => ({ product: i.product, quantity: i.quantity, price: i.price, cost: 0, discount: i.discount || 0, tax: { vat: 0, nbt: 0 }, total: i.price * i.quantity })),
        subtotal,
        tax: { vat: 0, nbt: 0 },
        discount,
        total,
        payment: { method: 'cash', amount: 0 },
        status: 'held',
        notes: note,
      });
      res.status(201).json({ success: true, data: { ticket: { id: doc._id, invoiceNo: doc.invoiceNo } } });
    } catch (err) {
      next(err);
    }
  }

  static async resume(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const sale = await Sale.findById(id);
      if (!sale || sale.status !== 'held') return res.status(404).json({ success: false, message: 'Ticket not found' });
      res.json({ success: true, data: { ticket: sale } });
    } catch (err) {
      next(err);
    }
  }
}


