import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    price: {
      type: Number,
      required: true,
      min: 0
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      vat: {
        type: Number,
        default: 0,
        min: 0
      },
      nbt: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    variant: {
      name: String,
      option: String
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    vat: {
      type: Number,
      default: 0,
      min: 0
    },
    nbt: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'digital', 'credit'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reference: {
      type: String,
      trim: true
    },
    change: {
      type: Number,
      default: 0,
      min: 0
    },
    cardType: {
      type: String
    },
    transactionId: {
      type: String
    }
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled', 'refunded', 'held'],
    default: 'completed'
  },
  notes: {
    type: String,
    trim: true
  },
  receiptPrinted: {
    type: Boolean,
    default: false
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  smsSent: {
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
saleSchema.index({ invoiceNo: 1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ cashier: 1 });
saleSchema.index({ status: 1 });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ 'payment.method': 1 });
saleSchema.index({ total: 1 });

export const Sale = mongoose.model('Sale', saleSchema);
