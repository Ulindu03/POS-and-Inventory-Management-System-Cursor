import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  minimumStock: {
    type: Number,
    default: 0,
    min: 0
  },
  reorderPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  availableStock: {
    type: Number,
    default: 0,
    min: 0
  },
  averageCost: {
    type: Number,
    default: 0,
    min: 0
  },
  lastPurchasePrice: {
    type: Number,
    min: 0
  },
  lastPurchaseDate: {
    type: Date
  },
  lastSaleDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  batchNumber: {
    type: String
  },
  location: {
    type: String,
    default: 'main'
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
inventorySchema.index({ product: 1 });
inventorySchema.index({ currentStock: 1 });
inventorySchema.index({ 'currentStock': 1, 'minimumStock': 1 });
inventorySchema.index({ location: 1 });
inventorySchema.index({ supplier: 1 });
inventorySchema.index({ expiryDate: 1 });

export const Inventory = mongoose.model('Inventory', inventorySchema);
