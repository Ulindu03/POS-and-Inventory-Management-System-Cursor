import mongoose from 'mongoose';

const stickerBatchSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  layout: {
  // Allow any label size key (e.g., '50x25', '50x30', '50x35', '40x30', 'a4_5x7_auto', 'custom')
  labelSize: { type: String, trim: true, default: '50x25' },
    customSize: {
      widthMm: { type: Number, min: 10 },
      heightMm: { type: Number, min: 10 },
    },
    sheetType: { type: String, enum: ['roll', 'a4'], default: 'roll' },
    columns: { type: Number, min: 1, default: 3 },
    rows: { type: Number, min: 1, default: 10 },
    marginMm: { type: Number, min: 0, default: 2 },
    gapMm: { type: Number, min: 0, default: 2 },
  },
  mode: {
    type: String,
    enum: ['reuse_product_barcode', 'unique_per_unit'],
    default: 'reuse_product_barcode',
  },
  barcodes: [{ type: String, trim: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  printedAt: { type: Date },
}, { timestamps: true });

stickerBatchSchema.index({ product: 1, createdAt: -1 });

export const StickerBatch = mongoose.model('StickerBatch', stickerBatchSchema);
