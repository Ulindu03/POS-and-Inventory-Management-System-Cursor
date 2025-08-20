import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category.model';

export class CategoryController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await Category.find({ isActive: true })
        .select('name color parent level sortOrder')
        .sort({ sortOrder: 1, 'name.en': 1 });
      res.json({ success: true, data: { items } });
    } catch (err) {
      next(err);
    }
  }
}


