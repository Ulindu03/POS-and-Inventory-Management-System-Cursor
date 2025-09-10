import mongoose from 'mongoose';

const subCustomerSnapshot = new mongoose.Schema({ name: String, phone: String, nic: String }, { _id: false });
const subProductSnapshot = new mongoose.Schema({ sku: String, name: String, brand: String }, { _id: false });
const subWarrantySnapshot = new mongoose.Schema({ warrantyNo: String, type: String, startDate: Date, endDate: Date }, { _id: false });

const historyEntry = new mongoose.Schema({ action: String, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: { type: Date, default: Date.now }, notes: String }, { _id: false });

const warrantyClaimSchema = new mongoose.Schema({
  claimNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
  warranty: { type: mongoose.Schema.Types.ObjectId, ref: 'Warranty', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  // reportedBy may be a system action; keep optional
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  issueCategory: { type: String, enum: ['mechanical','electrical','cosmetic','software','other'], required: true },
  issueDescription: { type: String, required: true },
  observedAt: { type: Date },
  photos: [String],
  documents: [String],
  // Extended lifecycle statuses per spec
  status: { type: String, enum: ['open','inspection','validation','awaiting_customer','approved','rejected','repair_in_progress','replacement_pending','resolved','closed'], default: 'open', index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  // Snapshots for analytics/reporting (denormalized)
  warrantySnapshot: subWarrantySnapshot,
  productSnapshot: subProductSnapshot,
  customerSnapshot: subCustomerSnapshot,
  resolution: {
    type: { type: String, enum: ['repair','replace','refund','none'], default: 'none' },
    details: String,
    replacementWarranty: { type: mongoose.Schema.Types.ObjectId, ref: 'Warranty' },
    cost: { type: Number, min: 0 }
  },
  sla: {
    firstResponseDue: Date,
    resolutionDue: Date,
    firstResponseMet: Boolean,
    resolutionMet: Boolean
  },
  history: [historyEntry],
  fraudFlags: [{ type: { type: String }, reason: String, detectedAt: Date }],
  customerFeedback: { rating: Number, comments: String, submittedAt: Date },
  closedAt: Date,
}, { timestamps: true });

warrantyClaimSchema.index({ createdAt: -1 });
warrantyClaimSchema.index({ issueCategory: 1 });
// Removed duplicate single-field indexes for claimNo & status (already covered by unique/index in schema definition)

export const WarrantyClaim = mongoose.model('WarrantyClaim', warrantyClaimSchema);