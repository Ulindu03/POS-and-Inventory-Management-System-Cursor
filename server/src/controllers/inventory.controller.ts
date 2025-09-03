import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product.model';

export class InventoryController {
  // GET /api/inventory/low-stock
  static async lowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '100' } = req.query as Record<string, string>;
  // Fetch candidates then filter in JS to compare fields reliably
  const items = await Product.find({})
        .select('sku name category supplier stock price')
        .limit(Math.min(parseInt(String(limit), 10) || 100, 500))
        .populate('category', 'name')
        .populate('supplier', 'name supplierCode');

      // Fallback since $lte with field ref is tricky in Mongoose without aggregation
  const filtered = items.filter((p: any) => {
        const c = p.stock?.current ?? 0;
        const min = p.stock?.minimum ?? 0;
        const rp = p.stock?.reorderPoint ?? 0;
        return c <= min || c <= rp;
      });

      const mapped = filtered.map((p: any) => {
        const current = p.stock?.current ?? 0;
        const min = p.stock?.minimum ?? 0;
        const rp = p.stock?.reorderPoint ?? 0;
        const target = Math.max(min, rp);
        const suggestedReorder = Math.max(0, target * 2 - current); // simple heuristic
        return {
          _id: p._id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          supplier: p.supplier,
          currentStock: current,
          minimumStock: min,
          reorderPoint: rp,
          suggestedReorder,
          price: p.price?.cost ?? 0,
        };
      });

      return res.json({ success: true, data: { items: mapped } });
    } catch (err) {
      return next(err);
    }
  }

  // GET /api/inventory/reorder-suggestions
  static async reorderSuggestions(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await Product.find()
        .select('sku name supplier stock price')
        .populate('supplier', 'name supplierCode');
      const suggestions: Record<string, { supplier: any; lines: Array<{ product: string; sku: string; name: any; qty: number; unitCost: number }>; subtotal: number } > = {};
      for (const p of items as any[]) {
        const current = p.stock?.current ?? 0;
        const min = p.stock?.minimum ?? 0;
        const rp = p.stock?.reorderPoint ?? 0;
        const target = Math.max(min, rp);
        const qty = Math.max(0, target * 2 - current);
        if (qty <= 0) continue;
        const supKey = p.supplier?._id?.toString() || 'unknown';
        if (!suggestions[supKey]) suggestions[supKey] = { supplier: p.supplier || null, lines: [], subtotal: 0 };
        const unitCost = p.price?.cost ?? 0;
        suggestions[supKey].lines.push({ product: p._id.toString(), sku: p.sku, name: p.name, qty, unitCost });
        suggestions[supKey].subtotal += unitCost * qty;
      }
      return res.json({ success: true, data: { suppliers: suggestions } });
    } catch (err) {
      return next(err);
    }
  }
}
