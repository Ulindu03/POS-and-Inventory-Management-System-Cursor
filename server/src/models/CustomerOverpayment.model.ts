import mongoose from 'mongoose';

// Customer overpayment model for handling credit balances
const customerOverpaymentSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  source: {
    type: String,
    enum: ['refund', 'overpayment', 'store_credit', 'gift_card'],
    required: true
  },
  sourceReference: {
    type: String,
    trim: true
  },
  originalSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  balance: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'fully_used', 'expired', 'cancelled'],
    default: 'active'
  },
  expiryDate: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usageHistory: [{
    usedAmount: {
      type: Number,
      required: true,
      min: 0
    },
    remainingBalance: {
      type: Number,
      required: true,
      min: 0
    },
    usedInSale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
customerOverpaymentSchema.index({ customer: 1, status: 1 });
customerOverpaymentSchema.index({ status: 1 });
customerOverpaymentSchema.index({ expiryDate: 1 });
customerOverpaymentSchema.index({ createdAt: -1 });

export const CustomerOverpayment = mongoose.model('CustomerOverpayment', customerOverpaymentSchema);