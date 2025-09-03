import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  type: {
    type: String,
    enum: ['sale', 'purchase', 'refund', 'credit_payment', 'supplier_payment'],
    required: true
  },
  method: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'digital', 'cheque', 'credit'],
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
  reference: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  cardDetails: {
    type: {
      type: String,
      enum: ['visa', 'mastercard', 'amex', 'discover']
    },
    last4: {
      type: String,
      maxlength: 4
    },
    expiryMonth: {
      type: Number,
      min: 1,
      max: 12
    },
    expiryYear: {
      type: Number
    }
  },
  bankDetails: {
    bankName: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    branch: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  receiptPrinted: {
    type: Boolean,
    default: false
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
paymentSchema.index({ customer: 1 });
paymentSchema.index({ supplier: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ method: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ processedAt: -1 });
paymentSchema.index({ transactionId: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
