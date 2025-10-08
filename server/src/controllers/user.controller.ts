import { Request, Response } from 'express';
import { User, IUser } from '../models/User.model';
import { emit } from '../services/realtime.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const query = {};
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return res.json({ success: true, data: { items: users, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to list users', error: (error as Error).message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body as Partial<IUser> & { password: string };
    if (!payload.username || !payload.email || !payload.password || !payload.firstName || !payload.lastName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const exists = await User.findOne({ $or: [{ username: payload.username }, { email: payload.email }] });
    if (exists) return res.status(409).json({ success: false, message: 'User already exists' });
    const user = new User(payload);
  await user.save();
  emit('user:created', { id: user._id, username: user.username });
    const safeUser = user.toObject();
    delete (safeUser as any).password;
    delete (safeUser as any).refreshToken;
    delete (safeUser as any).resetPasswordToken;
    delete (safeUser as any).resetPasswordExpires;
    return res.status(201).json({ success: true, data: safeUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create user', error: (error as Error).message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body as Partial<IUser>;
    delete (payload as any).password;
    const user = await User.findByIdAndUpdate(id, payload, { new: true })?.select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  emit('user:updated', { id: user._id });
  return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user', error: (error as Error).message });
  }
};

export const setUserActive = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body as { isActive: boolean };
    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true })?.select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  emit('user:updated', { id: user._id });
  return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user status', error: (error as Error).message });
  }
};

export const setUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body as { role: 'store_owner' | 'admin' | 'cashier' | 'sales_rep' };
    const user = await User.findByIdAndUpdate(id, { role }, { new: true })?.select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user role', error: (error as Error).message });
  }
};

export const setUserFaceEmbedding = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { faceEmbedding } = req.body as { faceEmbedding?: unknown };

    if (!Array.isArray(faceEmbedding) || !faceEmbedding.every((n) => typeof n === 'number')) {
      return res.status(400).json({ success: false, message: 'faceEmbedding must be an array of numbers' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { faceEmbedding: faceEmbedding as number[] },
      { new: true }
    )?.select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    emit('user:updated', { id: user._id });
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update face embedding', error: (error as Error).message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
  const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  emit('user:deleted', { id });
  return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete user', error: (error as Error).message });
  }
};
