import { Warranty } from '../models/Warranty.model';
import { Product } from '../models/Product.model';
import { Customer } from '../models/Customer.model';
import { Sale } from '../models/Sale.model';
import { UnitBarcode } from '../models/UnitBarcode.model';
import crypto from 'crypto';

export async function nextWarrantyNo() {
  // Simple incremental / random hybrid (improve with a counters collection if high volume)
  return 'W' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

export async function issueWarranty(params: {
  productId: string; saleId?: string; saleItemId?: string; customerId: string; issuedBy: string; periodDays: number; coverage?: string[]; exclusions?: string[]; type?: 'manufacturer'|'extended'|'replacement'; requiresActivation?: boolean; serialNumber?: string; batchNumber?: string; branchId?: string; unitBarcode?: string;
}) {
  const product = await Product.findById(params.productId).lean();
  const customer = await Customer.findById(params.customerId).lean();
  if (!product) throw new Error('Product not found');
  if (!customer) throw new Error('Customer not found');

  const now = new Date();
  const activationDate = params.requiresActivation ? undefined : now;
  const end = new Date((activationDate || now).getTime() + params.periodDays * 86400000);

  // Optionally load sale for invoice snapshot
  let saleDoc: any = null;
  if (params.saleId) {
    try { saleDoc = await Sale.findById(params.saleId).select('invoiceNo createdAt').lean(); } catch {}
  }

  const warranty = await Warranty.create({
    warrantyNo: await nextWarrantyNo(),
    product: product._id,
    sale: params.saleId,
    saleItemId: params.saleItemId,
    customer: customer._id,
    issuedBy: params.issuedBy,
    branchId: params.branchId,
    serialNumber: params.serialNumber,
    batchNumber: params.batchNumber,
    type: params.type || 'manufacturer',
    coverage: params.coverage || product.warranty?.coverage || [],
    exclusions: params.exclusions || product.warranty?.exclusions || [],
    periodDays: params.periodDays,
    startDate: now,
    activationDate,
    endDate: end,
    status: activationDate ? 'active' : 'pending_activation',
    customerSnapshot: {
      name: customer.name ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      nic: (customer as any).nic ?? '',
      type: customer.type ?? ''
    },
    productSnapshot: {
      sku: product.sku ?? '',
      name: (product as any).name?.en || (product as any).name || '',
      category: product.category?.toString?.() || '',
      brand: (product as any).brand || '',
      barcode: params.unitBarcode || (product as any).barcode || ''
    },
    saleSnapshot: saleDoc ? { invoiceNo: saleDoc.invoiceNo || '', date: saleDoc.createdAt } : undefined,
    events: [{ type: 'issued', timestamp: now }]
  });

  // Track warranty in barcodes if sold from this sale
  if (params.saleId && params.productId) {
    try {
      await UnitBarcode.updateOne(
        { product: params.productId, sale: params.saleId, status: 'sold', warranty: { $exists: false } },
        { 
          $set: { 
            warranty: warranty._id,
            warrantyStart: now,
            warrantyEnd: end
          } 
        }
      );
    } catch (bcErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[barcode.track.warranty] failed', bcErr);
      }
    }
  }

  return warranty;
}

export async function activateWarranty(id: string, serial: string, userId: string) {
  const warranty = await Warranty.findById(id);
  if (!warranty) throw new Error('Warranty not found');
  if (warranty.status !== 'pending_activation') throw new Error('Not in pending_activation state');
  if (serial) {
    const existing = await Warranty.findOne({ serialNumber: serial });
    if (existing) throw new Error('Serial already in use');
    warranty.serialNumber = serial;
  }
  const now = new Date();
  warranty.activationDate = now;
  warranty.endDate = new Date(now.getTime() + warranty.periodDays * 86400000);
  warranty.status = 'active';
  warranty.events.push({ type: 'activated', timestamp: now, user: userId as any });
  await warranty.save();
  return warranty;
}

export async function listWarranties(filter: any, pagination: { page?: number; pageSize?: number } = {}) {
  const page = pagination.page || 1;
  const pageSize = Math.min(pagination.pageSize || 25, 100);
  const q: any = {};
  if (filter.status) q.status = filter.status;
  if (filter.customerId) q.customer = filter.customerId;
  if (filter.productId) q.product = filter.productId;
  if (filter.saleId) q.sale = filter.saleId;
  if (filter.serial) q.serialNumber = filter.serial;
  if (filter.phone) q['customerSnapshot.phone'] = filter.phone;
  if (filter.nic) q['customerSnapshot.nic'] = filter.nic;
  if (filter.barcode) q['productSnapshot.barcode'] = filter.barcode;
  if (filter.sku) q['productSnapshot.sku'] = filter.sku;
  if (filter.branchId) q.branchId = filter.branchId;
  if (filter.invoiceNo) q['saleSnapshot.invoiceNo'] = filter.invoiceNo;
  if (filter.expiringInDays) {
    const now = new Date();
    const until = new Date(now.getTime() + Number(filter.expiringInDays) * 86400000);
    q.endDate = { $lte: until, $gte: now };
  }
  const [items, total] = await Promise.all([
    Warranty.find(q).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Warranty.countDocuments(q)
  ]);
  return { items, total, page, pageSize };
}

export async function getWarranty(id: string) {
  return Warranty.findById(id).lean();
}

export async function addWarrantyEvent(id: string, evt: { type: string; user?: string; meta?: any }) {
  await Warranty.findByIdAndUpdate(id, { $push: { events: { ...evt, timestamp: new Date() } } });
}

export async function revokeWarranty(id: string, userId: string, reason?: string) {
  const w = await Warranty.findById(id);
  if (!w) throw new Error('Warranty not found');
  w.status = 'revoked';
  w.events.push({ type: 'revoked', timestamp: new Date(), user: userId as any, meta: { reason } });
  await w.save();
  return w;
}

export async function transferWarranty(id: string, toCustomerId: string, userId: string, reason?: string) {
  const w = await Warranty.findById(id);
  if (!w) throw new Error('Warranty not found');
  if (w.status !== 'active') throw new Error('Only active warranties can transfer');
  // Simple check: no open claims yet (claimsCount heuristic; proper claim linkage in later phase)
  if (w.claimsCount && w.claimsCount > 0) throw new Error('Transfer blocked: existing claims');
  const prevCustomer = w.customer;
  w.customer = toCustomerId as any;
  w.status = 'transferred';
  w.transferHistory.push({ fromCustomer: prevCustomer as any, toCustomer: toCustomerId as any, date: new Date(), reason });
  w.events.push({ type: 'transferred', timestamp: new Date(), user: userId as any, meta: { toCustomerId } });
  await w.save();
  return w;
}