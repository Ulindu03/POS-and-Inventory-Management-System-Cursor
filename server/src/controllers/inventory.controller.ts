import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product.model';
import { Inventory } from '../models/Inventory.model';

export class InventoryController {
  // GET /api/inventory/low-stock
  static async lowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '100' } = req.query as Record<string, string>;

      // Read from Inventory where thresholds actually live; treat 0 as unset
      const inventories = await Inventory.find({})
        .select('product currentStock minimumStock reorderPoint')
        .limit(Math.min(parseInt(String(limit), 10) || 100, 500))
        .populate({
          path: 'product',
          select: 'sku name category supplier price',
          populate: [
            { path: 'category', select: 'name' },
            // Include supplier email so quick-create PO panel can display it for user verification
            { path: 'supplier', select: 'name supplierCode email' },
          ],
        });

      const filtered = (inventories as any[]).filter((inv) => {
        const c = Number(inv.currentStock ?? 0);
        const min = Number(inv.minimumStock ?? 0);
        const rp = Number(inv.reorderPoint ?? 0);
        const thresholds = [min, rp].filter((x) => x > 0);
        if (thresholds.length === 0) return false; // no thresholds set, not a low-stock candidate
        const maxThresh = Math.max(...thresholds);
        return c <= maxThresh;
      });

  const mapped = filtered.map((inv: any) => {
        const current = Number(inv.currentStock ?? 0);
        const min = Number(inv.minimumStock ?? 0);
        const rp = Number(inv.reorderPoint ?? 0);
        const target = Math.max(min, rp, 0);
        const suggestedReorder = Math.max(0, target * 2 - current); // simple heuristic
        const p = inv.product || {};
  let stockStatus: 'low' | 'critical' | 'out';
        if (current <= 0) stockStatus = 'out';
        else {
          const positives = [min, rp].filter((x) => x > 0);
          const minThresh = positives.length ? Math.min(...positives) : Infinity;
          stockStatus = current <= minThresh ? 'critical' : 'low';
        }
        return {
          _id: p._id || inv._id,
          product: {
            _id: p._id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            supplier: p.supplier,
          },
          currentStock: current,
          minimumStock: min,
          reorderPoint: rp,
          suggestedReorder,
          price: p.price?.cost ?? 0,
          stockStatus,
        };
      });

      // Fallback for products without Inventory records (legacy data)
      const haveInvIds = new Set((inventories as any[]).map((iv: any) => String(iv.product?._id || iv.product)));
      const productFallback = await Product.find({ _id: { $nin: Array.from(haveInvIds) } })
        .select('sku name category supplier price stock')
        .populate('category', 'name')
  .populate('supplier', 'name supplierCode email')
        .lean();

      const fallbackLow = (productFallback as any[])
        .filter((p) => {
          const c = Number(p?.stock?.current ?? 0);
          const min = Number(p?.stock?.minimum ?? 0);
          const rp = Number(p?.stock?.reorderPoint ?? 0);
          const thresholds = [min, rp].filter((x) => x > 0);
          if (thresholds.length === 0) return false;
          const maxThresh = Math.max(...thresholds);
          return c <= maxThresh;
        })
        .map((p) => {
          const c = Number(p?.stock?.current ?? 0);
          const min = Number(p?.stock?.minimum ?? 0);
          const rp = Number(p?.stock?.reorderPoint ?? 0);
          const positives = [min, rp].filter((x) => x > 0);
          const minThresh = positives.length ? Math.min(...positives) : Infinity;
          const target = Math.max(min, rp, 0);
          const suggestedReorder = Math.max(0, target * 2 - c);
          const status: 'low' | 'critical' | 'out' = c <= 0 ? 'out' : (c <= minThresh ? 'critical' : 'low');
          return {
            _id: p._id,
            product: {
              _id: p._id,
              sku: p.sku,
              name: p.name,
              category: p.category,
              supplier: p.supplier,
            },
            currentStock: c,
            minimumStock: min,
            reorderPoint: rp,
            suggestedReorder,
            price: p.price?.cost ?? 0,
            stockStatus: status,
          };
        });

      const all = [...mapped, ...fallbackLow];
      const cap = Math.min(parseInt(String(limit), 10) || 100, 500);
      return res.json({ success: true, data: { items: all.slice(0, cap) } });
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
