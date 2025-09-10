import { Warranty } from '../models/Warranty.model';
import { WarrantyClaim } from '../models/WarrantyClaim.model';
import { Product } from '../models/Product.model';
import { Customer } from '../models/Customer.model';
import crypto from 'crypto';

export async function nextClaimNo() {
  return 'C' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

export async function createClaim(params: { warrantyId: string; customerId: string; productId: string; issueCategory: string; issueDescription: string; reportedBy?: string; branchId?: string; }) {
  const warranty = await Warranty.findById(params.warrantyId);
  if (!warranty) throw new Error('Warranty not found');
  if (!['active','pending_activation'].includes(warranty.status)) throw new Error('Warranty not eligible for claim');
  const [product, customer] = await Promise.all([
    Product.findById(params.productId).lean(),
    Customer.findById(params.customerId).lean()
  ]);
  const now = new Date();
  const claimCreate: any = {
    claimNo: await nextClaimNo(),
    warranty: warranty._id,
    product: params.productId,
    customer: params.customerId,
    issueCategory: params.issueCategory,
    issueDescription: params.issueDescription,
    status: 'open',
    branchId: params.branchId,
    warrantySnapshot: { warrantyNo: warranty.warrantyNo, type: warranty.type, startDate: warranty.startDate, endDate: warranty.endDate },
    productSnapshot: { sku: (product as any)?.sku || '', name: (product as any)?.name?.en || (product as any)?.name || '', brand: (product as any)?.brand || '' },
    customerSnapshot: { name: (customer as any)?.name || '', phone: (customer as any)?.phone || '', nic: (customer as any)?.nic || '' },
    history: [{ action: 'created', timestamp: now }]
  };
  // Only set reportedBy & user history if it looks like a valid ObjectId (24 hex) else treat as system
  if (params.reportedBy && /^[a-fA-F0-9]{24}$/.test(params.reportedBy)) {
    claimCreate.reportedBy = params.reportedBy;
    claimCreate.history[0].user = params.reportedBy as any;
  }
  const claim = await WarrantyClaim.create(claimCreate);
  warranty.claimsCount = (warranty.claimsCount || 0) + 1;
  warranty.lastClaimDate = now;
  const evt: any = { type: 'claim_created', timestamp: now, meta: { claim: claim._id } };
  if (params.reportedBy && /^[a-fA-F0-9]{24}$/.test(params.reportedBy)) {
    evt.user = params.reportedBy as any;
  }
  warranty.events.push(evt);
  await warranty.save();
  return claim;
}

export async function updateClaimStatus(id: string, status: string, userId: string, notes?: string) {
  const claim = await WarrantyClaim.findById(id);
  if (!claim) throw new Error('Claim not found');
  claim.status = status as any;
  claim.history.push({ action: 'status_change', user: userId as any, notes, timestamp: new Date() });
  await claim.save();
  return claim;
}

export async function listClaims(filter: any, pagination: { page?: number; pageSize?: number } = {}) {
  const page = pagination.page || 1;
  const pageSize = Math.min(pagination.pageSize || 25, 100);
  const q: any = {};
  if (filter.status) q.status = filter.status;
  if (filter.assignedTo) q.assignedTo = filter.assignedTo;
  if (filter.issueCategory) q.issueCategory = filter.issueCategory;
  if (filter.warranty) q.warranty = filter.warranty;
  const [items, total] = await Promise.all([
    WarrantyClaim.find(q).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    WarrantyClaim.countDocuments(q)
  ]);
  return { items, total, page, pageSize };
}

export async function getClaim(id: string) {
  return WarrantyClaim.findById(id).lean();
}