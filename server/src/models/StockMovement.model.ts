import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['purchase', 'sale', 'adjustment', 'transfer', 'return', 'damage', 'expiry'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number,
    min: 0
  },
  totalCost: {
    type: Number,
    min: 0
  },
  reference: {
    type: String,
    trim: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  referenceType: {
    type: String,
    enum: ['Sale', 'Purchase', 'Delivery', 'Damage', 'Adjustment']
  },
  reason: {
    type: String,
    trim: true
  },
  location: {
    from: {
      type: String,
      default: 'main'
    },
    to: {
      type: String,
      default: 'main'
    }
  },
  batchNumber: {
    type: String
  },
  expiryDate: {
    type: Date
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
stockMovementSchema.index({ product: 1 });
stockMovementSchema.index({ type: 1 });
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ referenceId: 1, referenceType: 1 });
stockMovementSchema.index({ performedBy: 1 });
stockMovementSchema.index({ batchNumber: 1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
