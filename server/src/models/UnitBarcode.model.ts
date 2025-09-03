import mongoose from 'mongoose';

const unitBarcodeSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
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
  }
}, { timestamps: true });

unitBarcodeSchema.index({ product: 1, createdAt: -1 });

export const UnitBarcode = mongoose.model('UnitBarcode', unitBarcodeSchema);
