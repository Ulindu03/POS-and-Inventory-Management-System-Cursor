import mongoose from 'mongoose';

// Enhanced Warranty schema per new spec (backward compatible fields retained where possible)
const warrantySchema = new mongoose.Schema({
  warrantyNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  saleItemId: { type: mongoose.Schema.Types.ObjectId },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Branch / location support (Phase 2 multi-branch)
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  serialNumber: { type: String, trim: true, index: true, sparse: true },
  batchNumber: { type: String, trim: true },
  type: { type: String, enum: ['manufacturer','extended','replacement'], default: 'manufacturer' },
  coverage: [{ type: String, trim: true }],
  exclusions: [{ type: String, trim: true }],
  periodDays: { type: Number, required: true, min: 1 },
  startDate: { type: Date, required: true },
  activationDate: { type: Date },
  endDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ['pending_activation','active','expired','revoked','transferred'], default: 'pending_activation', index: true },
  claimsCount: { type: Number, default: 0 },
  lastClaimDate: { type: Date },
  // Snapshot fields for fast reporting & historical accuracy (denormalized)
  customerSnapshot: new mongoose.Schema({
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    nic: { type: String },
    type: { type: String }
  }, { _id: false }),
  productSnapshot: new mongoose.Schema({
    sku: { type: String },
    name: { type: String },
    category: { type: String },
    brand: { type: String },
    barcode: { type: String }
  }, { _id: false }),
  saleSnapshot: new mongoose.Schema({
    invoiceNo: { type: String },
    date: { type: Date }
  }, { _id: false }),
  transferHistory: [{ fromCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, toCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, date: Date, reason: String }],
  events: [{ type: { type: String }, timestamp: { type: Date, default: Date.now }, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, meta: {} }],
  qrCodeUrl: { type: String },
  notes: { type: String, trim: true },
  // Backward compatibility legacy fields (optional)
  warrantyType: { type: String },
  duration: { type: Number },
  durationUnit: { type: String },
}, { timestamps: true });

// Explicit indexes (avoid duplicating those already defined inline via unique/index on fields)
warrantySchema.index({ customer: 1 });
warrantySchema.index({ product: 1 });
warrantySchema.index({ status: 1, endDate: 1 });
// Compound & text indexes for advanced search
warrantySchema.index({ 'customerSnapshot.phone': 1 });
warrantySchema.index({ 'customerSnapshot.nic': 1 });
warrantySchema.index({ 'productSnapshot.sku': 1 });
warrantySchema.index({ 'productSnapshot.barcode': 1 });
warrantySchema.index({ branchId: 1, status: 1 });

export const Warranty = mongoose.model('Warranty', warrantySchema);
