import { Request, Response, NextFunction } from 'express';
import { Sale } from '../models/Sale.model';
import { Product } from '../models/Product.model';

export class ReturnController {
  // POST /api/returns
  static async create(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { saleId, items, reason, disposition } = req.body as {
        saleId: string;
        items: Array<{ product: string; quantity: number; amount: number }>;
        reason: 'defective' | 'wrong_item' | 'expired' | 'damaged' | 'other';
        disposition: 'restock' | 'damage' | 'write_off';
      };
      const sale = await Sale.findById(saleId);
      if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No items' });

      const total = items.reduce((s, i) => s + Math.max(0, i.amount), 0);
      // Attach to sale.returns with reason
      (sale as any).returns = [
        ...((sale as any).returns || []),
        { items, total, method: 'cash', reference: reason }
      ];
      (sale as any).total = Math.max(0, (sale as any).total - total);
      if ((sale as any).total === 0) (sale as any).status = 'refunded';
      await sale.save();

      // Adjust inventory per disposition
      for (const line of items) {
        if (disposition === 'restock') {
          await Product.updateOne({ _id: line.product }, { $inc: { 'stock.current': line.quantity } });
        } else {
          // damage/write_off: do not increase stock; optional: create Damage record (future work)
        }
      }

      return res.status(201).json({ success: true, data: { return: { total, reason, disposition } } });
    } catch (err) {
      return next(err);
    }
  }
}
