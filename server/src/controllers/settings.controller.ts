import { Response } from 'express';
import { Settings } from '../models/Settings.model';
import { AuthRequest } from '../middleware/auth.middleware';

export const getSettings = async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      const created = await Settings.create({});
      return res.json({ success: true, data: created });
    }
    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load settings', error: (error as Error).message });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body;
    const updated = await Settings.findOneAndUpdate({}, { $set: payload }, { new: true, upsert: true });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update settings', error: (error as Error).message });
  }
};
