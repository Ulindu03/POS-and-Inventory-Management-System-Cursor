import mongoose from 'mongoose';

// Exchange slip model for handling exchanges
const exchangeSlipSchema = new mongoose.Schema({
  slipNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  originalSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    exchangeValue: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalValue: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'redeemed', 'expired', 'cancelled'],
    default: 'active'
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  },
  expiryDate: {
    type: Date,
    required: true
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  redeemedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  redeemedAt: {
    type: Date
  },
  redemptionSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries (skip redundant index on unique slipNo)
exchangeSlipSchema.index({ originalSale: 1 });
exchangeSlipSchema.index({ customer: 1 });
exchangeSlipSchema.index({ status: 1 });
exchangeSlipSchema.index({ expiryDate: 1 });
exchangeSlipSchema.index({ createdAt: -1 });

export const ExchangeSlip = mongoose.model('ExchangeSlip', exchangeSlipSchema);