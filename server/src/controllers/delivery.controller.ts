import { Response } from 'express';
import { Delivery } from '../models/Delivery.model';
import { emit } from '../services/realtime.service';
import { cacheBust } from '../middleware/cache.middleware';
import { sendEmail } from '../services/notify.service';
import { AuthRequest } from '../middleware/auth.middleware';

// Helper to update media fields on a nested shop by id
async function setShopMedia(id: string, shopId: string, fields: Partial<{ proofOfDelivery: string; signature: string }>) {
  const delivery = await Delivery.findById(id);
  if (!delivery) return { error: 'Delivery not found' as const };
  const shop: any = delivery.shops.id(shopId);
  if (!shop) return { error: 'Stop not found' as const };
  if (typeof fields.proofOfDelivery === 'string') shop.proofOfDelivery = fields.proofOfDelivery;
  if (typeof fields.signature === 'string') shop.signature = fields.signature;
  await delivery.save();
  return { delivery, shop } as const;
}

export const listDeliveries = async (req: AuthRequest, res: Response) => {
  try {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const {
    status,
    from,
    to,
    driver,
    vehicle,
    q,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query as any;

  const filter: any = {};
  if (status) filter.status = status;
  if (from || to) {
    filter.scheduledDate = {};
    if (from) filter.scheduledDate.$gte = new Date(String(from));
    if (to) filter.scheduledDate.$lte = new Date(String(to));
  }
  if (driver) filter['lorryDetails.driverName'] = new RegExp(String(driver), 'i');
  if (vehicle) filter['lorryDetails.vehicleNo'] = new RegExp(String(vehicle), 'i');
  if (q) {
    filter.$or = [
      { deliveryNo: new RegExp(String(q), 'i') },
      { 'lorryDetails.driverName': new RegExp(String(q), 'i') },
      { 'lorryDetails.vehicleNo': new RegExp(String(q), 'i') },
      { route: new RegExp(String(q), 'i') },
    ];
  }

  const total = await Delivery.countDocuments(filter);
  const deliveries = await Delivery.find(filter)
    .sort({ [String(sortBy)]: String(sortOrder) === 'asc' ? 1 : -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  return res.json({ success: true, data: { items: deliveries, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to list deliveries', error: (error as Error).message });
  }
};

export const createDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body || {};
    const count = await Delivery.countDocuments();
    const deliveryNo = `DLV-${(count + 1).toString().padStart(6, '0')}`;
    // Always trust authenticated user for salesRep instead of client-provided value
    const salesRep = req.user?.userId;
    if (!salesRep) {
      return res.status(401).json({ success: false, message: 'Unauthorized: missing sales rep' });
    }
    // Normalize scheduledDate if a string was provided
    const scheduledDate = payload.scheduledDate ? new Date(payload.scheduledDate) : undefined;
    const delivery = await Delivery.create({
      ...payload,
      salesRep,
      ...(scheduledDate ? { scheduledDate } : {}),
      deliveryNo,
    });
  emit('delivery:created', delivery);
  cacheBust(/\/api\/deliveries/);
    return res.status(201).json({ success: true, data: delivery });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create delivery', error: (error as Error).message });
  }
};

export const getDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const delivery = await Delivery.findById(id)
      .populate({ path: 'shops.customer', select: 'name customerCode' })
      .populate({ path: 'shops.items.product', select: 'name price barcode sku' });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
  emit('delivery:updated', delivery);
  cacheBust(/\/api\/deliveries/);
  return res.json({ success: true, data: delivery });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to get delivery', error: (error as Error).message });
  }
};

export const updateDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const payload = req.body;
    const delivery = await Delivery.findByIdAndUpdate(id, payload, { new: true });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    return res.json({ success: true, data: delivery });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update delivery', error: (error as Error).message });
  }
};

export const updateDeliveryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: 'scheduled' | 'in_transit' | 'completed' | 'cancelled' | 'returned' };
  const delivery = await Delivery.findByIdAndUpdate(id, { status }, { new: true });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    emit('delivery:status', delivery);
    cacheBust(/\/api\/deliveries/);
    if (status === 'completed') {
      // fire-and-forget notification (logs until provider integrated)
      void sendEmail('Delivery Completed', 'ops@voltzone.lk', `Delivery ${delivery.deliveryNo} marked as completed.`);
    }
  return res.json({ success: true, data: delivery });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update status', error: (error as Error).message });
  }
};

// Upload proof of delivery for a specific stop
export const uploadStopProof = async (req: AuthRequest, res: Response) => {
  try {
    const { id, shopId } = req.params as { id: string; shopId: string };
    const file: any = (req as any).file;
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const delivery = await Delivery.findById(id);
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    const shop: any = delivery.shops.id(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Stop not found' });
    shop.proofOfDelivery = `/uploads/${file.filename}`;
    await delivery.save();
    return res.json({ success: true, data: { proofOfDelivery: shop.proofOfDelivery } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to upload proof', error: (error as Error).message });
  }
};

// Upload signature image for a specific stop
export const uploadStopSignature = async (req: AuthRequest, res: Response) => {
  try {
    const { id, shopId } = req.params as { id: string; shopId: string };
    const file: any = (req as any).file;
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const delivery = await Delivery.findById(id);
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    const shop: any = delivery.shops.id(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Stop not found' });
    shop.signature = `/uploads/${file.filename}`;
    await delivery.save();
    return res.json({ success: true, data: { signature: shop.signature } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to upload signature', error: (error as Error).message });
  }
};

// New: set proof/signature URLs (e.g., Supabase public URLs) for a specific stop
export const setStopMedia = async (req: AuthRequest, res: Response) => {
  try {
    const { id, shopId } = req.params as { id: string; shopId: string };
    const { proofOfDelivery, signature } = req.body as { proofOfDelivery?: string; signature?: string };
    if (!proofOfDelivery && !signature) {
      return res.status(400).json({ success: false, message: 'No media fields provided' });
    }
    const result = await setShopMedia(id, shopId, { proofOfDelivery, signature });
    if ('error' in result) {
      return res.status(404).json({ success: false, message: result.error });
    }
    return res.json({ success: true, data: { proofOfDelivery: result.shop.proofOfDelivery, signature: result.shop.signature } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to set stop media', error: (error as Error).message });
  }
};
