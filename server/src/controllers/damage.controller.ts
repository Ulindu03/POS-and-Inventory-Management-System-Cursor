import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Damage } from '../models/Damage.model';
import { Product } from '../models/Product.model';
import { StockMovement } from '../models/StockMovement.model';
import { AuthRequest } from '../middleware/auth.middleware';

const nextRef = async () => {
  const count = await Damage.countDocuments();
  return `DMG-${(count + 1).toString().padStart(6, '0')}`;
};

export const listDamages = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, type, reason, from, to } = req.query as any;
  const filter: any = {};
  if (type) filter.type = type;
  if (reason) filter['items.reason'] = reason;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(String(from));
    if (to) filter.createdAt.$lte = new Date(String(to));
  }
  const total = await Damage.countDocuments(filter);
  const items = await Damage.find(filter).sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
  res.json({ success: true, data: { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
};

// In-transit damage capture linked to trip/delivery/stop
export const reportTransitDamage = async (req: AuthRequest, res: Response) => {
  const { tripId, deliveryId, shopId, items, notes, priority } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No items' });
  const ref = await nextRef();
  const totalCost = items.reduce((s, it) => s + (Number(it.unitCost) * Number(it.quantity)), 0);
    const doc = await Damage.create({
    referenceNo: ref,
    type: 'delivery',
    source: { trip: tripId, delivery: deliveryId, location: shopId || 'in_transit' },
    items: items.map((it: any) => ({
      product: it.product,
      quantity: it.quantity,
      unitCost: it.unitCost,
      totalCost: Number(it.unitCost) * Number(it.quantity),
      reason: it.reason,
      description: it.description,
      images: it.images || [],
      batchNumber: it.batchNumber,
      expiryDate: it.expiryDate,
    })),
    totalCost,
    status: 'reported',
    priority: priority || 'medium',
  // Use JWT payload's userId (authenticate middleware provides { userId, ... })
      reportedBy: req.user?.userId,
    notes,
  });

  // Decrease inTransit/current stock appropriately and log movement
  for (const it of items) {
    const qty = Number(it.quantity);
    const prod = await Product.findById(it.product).select('stock');
    const prev = (prod as any)?.stock?.inTransit ?? 0;
    const next = prev - qty;
    await Product.updateOne({ _id: it.product }, { $inc: { 'stock.inTransit': -qty } });
    await StockMovement.create({
      product: it.product,
      quantity: -qty,
      type: 'damage',
      reason: it.reason,
      previousStock: prev,
      newStock: next,
      reference: ref,
      referenceType: 'Damage',
      performedBy: req.user?.userId,
      location: { from: 'in_transit', to: 'loss' },
    });
  }

  return res.status(201).json({ success: true, data: doc });
};

// Shop return damage intake with disposition
export const reportShopReturnDamage = async (req: AuthRequest, res: Response) => {
  const { customerId, saleId, items, reason, disposition, notes } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No items' });
  const ref = await nextRef();
  const totalCost = items.reduce((s: number, it: any) => s + (Number(it.unitCost) * Number(it.quantity)), 0);
  const action = ((): 'return_to_supplier' | 'write_off' => {
    if (disposition === 'return_to_vendor') return 'return_to_supplier';
    return 'write_off';
  })();
  // Build source object, handling special "walk-in" case gracefully
  const source: any = {};
  if (customerId && typeof customerId === 'string') {
    if (mongoose.isValidObjectId(customerId)) {
      source.customer = customerId;
    } else if (customerId.toLowerCase() === 'walk-in' || customerId.toLowerCase() === 'walkin') {
      source.location = 'walk-in';
    }
  }
  // Add sale reference if provided
  if (saleId && mongoose.isValidObjectId(saleId)) {
    source.sale = saleId;
  }
    const doc = await Damage.create({
    referenceNo: ref,
    type: 'shop_return',
    source,
    items: items.map((it: any) => ({
      product: it.product,
      quantity: it.quantity,
      unitCost: it.unitCost,
      totalCost: Number(it.unitCost) * Number(it.quantity),
      reason: it.reason,
      description: it.description,
      images: it.images || [],
    })),
    totalCost,
  status: 'reported',
  action,
    // Use JWT payload's userId (authenticate middleware provides { userId, ... })
      reportedBy: req.user?.userId,
    notes,
  });

  for (const it of items) {
    const qty = Number(it.quantity);
    const prod = await Product.findById(it.product).select('stock');
    const prev = (prod as any)?.stock?.current ?? 0;
    const next = disposition === 'restock' ? prev + qty : prev;
    if (disposition === 'restock') {
      await Product.updateOne({ _id: it.product }, { $inc: { 'stock.current': qty } });
    }
    await StockMovement.create({
      product: it.product,
      quantity: disposition === 'restock' ? qty : 0,
      type: disposition === 'restock' ? 'return' : 'damage',
      reason: (it as any)?.reason ?? reason,
      previousStock: prev,
      newStock: next,
      reference: ref,
      referenceType: 'Damage',
      performedBy: req.user?.userId,
    });
  }

  return res.status(201).json({ success: true, data: doc });
};

// Controlled taxonomy for reasons
export const getDamageReasons = async (_req: Request, res: Response) => {
  res.json({ success: true, data: ['broken', 'expired', 'defective', 'water_damage', 'crushed', 'torn', 'other'] });
};

// Cost analysis report
export const getDamageCostReport = async (req: Request, res: Response) => {
  const { from, to, groupBy = 'reason' } = req.query as any;
  const match: any = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(String(from));
    if (to) match.createdAt.$lte = new Date(String(to));
  }
  let groupField: any = '$items.reason';
  if (groupBy === 'product') groupField = '$items.product';
  else if (groupBy === 'supplier') groupField = '$productInfo.supplier';
  else if (groupBy === 'route') groupField = '$source.location';

  const pipeline: any[] = [
    { $match: match },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: '$productInfo' },
    {
      $group: {
        _id: groupField,
        totalQty: { $sum: '$items.quantity' },
        totalCost: { $sum: '$items.totalCost' },
        count: { $sum: 1 },
      }
    },
    { $sort: { totalCost: -1 } }
  ];

  const data = await Damage.aggregate(pipeline);
  return res.json({ success: true, data });
};
