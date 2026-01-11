import mongoose from 'mongoose';

const unitBarcodeSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StickerBatch',
    required: true,
    index: true,
  },
  printedAt: {
    type: Date,
    default: Date.now,
  },
  // Lifecycle tracking
  status: {
    type: String,
    enum: ['generated', 'in_stock', 'sold', 'returned', 'damaged', 'written_off'],
    default: 'generated',
    index: true,
  },
  // Sales tracking
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    index: true,
  },
  soldAt: Date,
  // Warranty tracking
  warranty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warranty',
    index: true,
  },
  warrantyStatus: {
    type: String,
    enum: ['none', 'active', 'expired', 'claimed', 'void'],
    default: 'none',
  },
  warrantyStartDate: Date,
  warrantyEndDate: Date,
  // Return tracking
  return: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Return',
    index: true,
  },
  returnedAt: Date,
  returnReason: String,
  // Damage tracking
  damage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Damage',
    index: true,
  },
  damagedAt: Date,
  damageReason: String,
  damageStatus: {
    type: String,
    enum: ['none', 'reported', 'assessed', 'written_off'],
    default: 'none',
  },
  // Customer tracking
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
  },
  // Metadata
  metadata: {
    notes: String,
    location: String,
  },
}, { timestamps: true });

unitBarcodeSchema.index({ product: 1, createdAt: -1 });
unitBarcodeSchema.index({ status: 1, updatedAt: -1 });

export const UnitBarcode = mongoose.model('UnitBarcode', unitBarcodeSchema);
