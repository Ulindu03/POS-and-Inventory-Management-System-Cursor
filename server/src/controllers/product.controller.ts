import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product.model';

export class ProductController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, category, limit = '24', page = '1' } = req.query as Record<string, string>;
      const filters: any = { isActive: true };
      if (category) filters.category = category;
      if (q) {
        filters.$or = [
          { 'name.en': { $regex: q, $options: 'i' } },
          { 'name.si': { $regex: q, $options: 'i' } },
          { sku: { $regex: q, $options: 'i' } },
          { barcode: { $regex: q, $options: 'i' } },
        ];
      }

      const take = Math.min(parseInt(limit, 10) || 24, 100);
      const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

      const [items, total] = await Promise.all([
        Product.find(filters)
          .select('sku barcode name price.retail category images.isPrimary images.url')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(take),
        Product.countDocuments(filters),
      ]);

      res.json({ success: true, data: { items, total, page: parseInt(page, 10) || 1, limit: take } });
    } catch (err) {
      next(err);
    }
  }

  static async getByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params as { code: string };
      const product = await Product.findOne({ barcode: code, isActive: true })
        .select('sku barcode name price.retail');
      if (!product) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: { product } });
    } catch (err) {
      next(err);
    }
  }
}


