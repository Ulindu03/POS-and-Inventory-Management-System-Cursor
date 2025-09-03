import { Request, Response, NextFunction } from 'express';
import { Sale } from '../models/Sale.model';
import { Product } from '../models/Product.model';
import { User } from '../models/User.model';
import { DiscountService } from '../services/discount.service';
import { Settings } from '../models/Settings.model';

const nextInvoiceNo = async (): Promise<string> => {
  const last = await Sale.findOne().sort({ createdAt: -1 }).select('invoiceNo');
  const n = last?.invoiceNo?.match(/(\d+)$/)?.[1];
  const next = (n ? parseInt(n, 10) + 1 : 1).toString().padStart(6, '0');
  return `INV-${next}`;
};

export class SaleController {
  static async create(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
  const { items, payment, payments, discount = 0, customer, discountCode, currency } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items' });
      }

      const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } }).select('price.cost price.retail stock.current');
  const costMap = new Map(products.map((p) => [p._id.toString(), (p as any).price?.cost || 0]));

      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      let discountAmount = Number(discount) || 0;
      if (discountCode) {
        try {
          const result = await DiscountService.validateCode({ code: String(discountCode), subtotal, customerId: customer || undefined });
          if (result.valid && typeof result.amount === 'number') discountAmount = result.amount;
        } catch {}
      }
      const vat = 0; // simplified
      const nbt = 0; // simplified
  const total = Math.max(0, subtotal + vat + nbt - discountAmount);

      const invoiceNo = await nextInvoiceNo();
      const cashierId = req.user?.userId || (await User.findOne().select('_id'))?._id; // fallback

  type InPayment = { method: string; amount: number; reference?: string; change?: number; cardType?: string; transactionId?: string };
  const incomingPayments: InPayment[] = [];
  if (Array.isArray(payments)) {
    for (const p of payments as InPayment[]) incomingPayments.push(p);
  } else if (payment) {
    incomingPayments.push(payment as InPayment);
  }
  const s = await Settings.findOne();
  const baseCode = s?.currency?.primary || 'LKR';
  const code = currency?.code || baseCode;
  const rate = currency?.rateToBase ?? (s?.currency?.fxRates?.get?.(code) || 1);
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
  currency: { code, rateToBase: rate, baseCode },
  discount,
        total,
  payment: payment || undefined,
  payments: incomingPayments,
        status: 'completed',
      });

  return res.status(201).json({ success: true, data: { sale: { id: doc._id, invoiceNo: doc.invoiceNo, total: doc.total } } });
    } catch (err) {
  return next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const sale = await Sale.findById(id).populate('items.product', 'sku name price');
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
  return res.json({ success: true, data: { sale } });
    } catch (err) {
  return next(err);
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
  return res.json({ success: true, data: { items, total, page: parseInt(page, 10) || 1, limit: take } });
    } catch (err) {
  return next(err);
    }
  }

  static async hold(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { items, discount = 0, customer, note, discountCode } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items' });
      }
      const invoiceNo = await nextInvoiceNo();
      const cashierId = req.user?.userId || (await User.findOne().select('_id'))?._id;
      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      let discountAmount = Number(discount) || 0;
      if (discountCode) {
        try {
          const result = await DiscountService.validateCode({ code: String(discountCode), subtotal, customerId: customer || undefined });
          if (result.valid && typeof result.amount === 'number') discountAmount = result.amount;
        } catch {}
      }
  const total = Math.max(0, subtotal - discountAmount);
  const s2 = await Settings.findOne();
  const baseCode2 = s2?.currency?.primary || 'LKR';
  const body = req.body;
  const code2 = body?.currency?.code || baseCode2;
  const rate2 = body?.currency?.rateToBase ?? (s2?.currency?.fxRates?.get?.(code2) || 1);
  const doc = await Sale.create({
        invoiceNo,
        customer: customer || null,
        cashier: cashierId,
        items: items.map((i: any) => ({ product: i.product, quantity: i.quantity, price: i.price, cost: 0, discount: i.discount || 0, tax: { vat: 0, nbt: 0 }, total: i.price * i.quantity })),
        subtotal,
  tax: { vat: 0, nbt: 0 },
  currency: { code: code2, rateToBase: rate2, baseCode: baseCode2 },
        discount: discountAmount,
        total,
        payment: { method: 'cash', amount: 0 },
        status: 'held',
        notes: note,
      });
      return res.status(201).json({ success: true, data: { ticket: { id: doc._id, invoiceNo: doc.invoiceNo } } });
    } catch (err) {
      return next(err);
    }
  }

  static async resume(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const sale = await Sale.findById(id);
  if (!sale || sale.status !== 'held') return res.status(404).json({ success: false, message: 'Ticket not found' });
  return res.json({ success: true, data: { ticket: sale } });
    } catch (err) {
  return next(err);
    }
  }

  // Validate a discount/promo code
  static async validateDiscount(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, subtotal } = req.body as { code: string; subtotal: number };
      if (!code) return res.status(400).json({ success: false, message: 'Code required' });
      const result = await DiscountService.validateCode({ code, subtotal });
      return res.json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  // Process a return/refund for a sale
  static async refund(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { items, method, reference } = req.body as { items: Array<{ product: string; quantity: number; amount: number }>; method: 'cash' | 'card' | 'bank_transfer' | 'digital' | 'credit'; reference?: string };
      const sale = await Sale.findById(id);
      if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No return items' });

      const returnTotal = items.reduce((s, i) => s + Math.max(0, i.amount), 0);

      // Append return record
      (sale as any).returns = [ ...((sale as any).returns || []), { items, total: returnTotal, method, reference } ];
      // Adjust sale total downward
      (sale as any).total = Math.max(0, (sale as any).total - returnTotal);
      // Mark refunded if full amount returned
      if ((sale as any).total === 0) (sale as any).status = 'refunded';

      await sale.save();
      return res.json({ success: true, data: { refund: { total: returnTotal }, sale: { id: sale._id, total: (sale as any).total, status: (sale as any).status } } });
    } catch (err) {
      return next(err);
    }
  }
}


