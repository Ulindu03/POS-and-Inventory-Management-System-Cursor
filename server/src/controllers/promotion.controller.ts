import { Request, Response } from 'express';
import { Discount } from '../models/Discount.model';

export class PromotionController {
  static async list(_req: Request, res: Response) {
    const items = await Discount.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: items });
  }
  static async create(req: Request & { user?: any }, res: Response) {
    const payload = req.body;
    payload.createdBy = req.user?.userId;
    const doc = await Discount.create(payload);
    return res.status(201).json({ success: true, data: doc });
  }
  static async update(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const doc = await Discount.findByIdAndUpdate(id, req.body, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: doc });
  }
  static async toggle(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const doc = await Discount.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    doc.isActive = !doc.isActive;
    await doc.save();
    return res.json({ success: true, data: doc });
  }
}
