import mongoose from 'mongoose';

// Return transaction model for comprehensive return tracking
const returnTransactionSchema = new mongoose.Schema({
  returnNo: {
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
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  returnType: {
    type: String,
    enum: ['full_refund', 'partial_refund', 'exchange', 'store_credit'],
    required: true
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
    returnAmount: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      enum: ['defective', 'expired', 'damaged', 'wrong_item', 'unwanted', 'size_issue', 'color_issue', 'other'],
      required: true
    },
    condition: {
      type: String,
      enum: ['new', 'opened', 'damaged', 'defective'],
      default: 'new'
    },
    disposition: {
      type: String,
      enum: ['restock', 'damage', 'write_off', 'return_to_supplier'],
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  refundMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'digital', 'store_credit', 'exchange_slip', 'overpayment'],
    required: true
  },
  refundDetails: {
    // For card refunds
    cardType: String,
    last4Digits: String,
    transactionId: String,
    // For bank transfers
    accountNumber: String,
    bankName: String,
    // For digital payments
    digitalWallet: String,
    // Reference number for any method
    reference: String
  },
  exchangeSlip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExchangeSlip'
  },
  overpaymentCreated: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerOverpayment'
  },
  managerApproval: {
    required: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    reason: {
      type: String,
      trim: true
    }
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    vat: {
      type: Number,
      default: 0
    },
    nbt: {
      type: Number,
      default: 0
    }
  },
  currency: {
    code: {
      type: String,
      default: 'LKR'
    },
    rateToBase: {
      type: Number,
      default: 1
    },
    baseCode: {
      type: String,
      default: 'LKR'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'processed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  receiptPrinted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries (avoid duplicating implicit unique index on returnNo)
returnTransactionSchema.index({ originalSale: 1 });
returnTransactionSchema.index({ customer: 1 });
returnTransactionSchema.index({ returnedBy: 1 });
returnTransactionSchema.index({ returnType: 1 });
returnTransactionSchema.index({ status: 1 });
returnTransactionSchema.index({ createdAt: -1 });
returnTransactionSchema.index({ 'items.reason': 1 });

export const ReturnTransaction = mongoose.model('ReturnTransaction', returnTransactionSchema);