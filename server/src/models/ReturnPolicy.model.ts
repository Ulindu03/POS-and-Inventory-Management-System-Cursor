import mongoose from 'mongoose';

// Return policy configuration model
const returnPolicySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  returnWindow: {
    days: {
      type: Number,
      default: 30,
      min: 0
    },
    extendedDays: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  refundMethods: {
    allowCash: {
      type: Boolean,
      default: true
    },
    allowCard: {
      type: Boolean,
      default: true
    },
    allowBankTransfer: {
      type: Boolean,
      default: false
    },
    allowDigital: {
      type: Boolean,
      default: true
    },
    allowStoreCredit: {
      type: Boolean,
      default: true
    },
    allowExchange: {
      type: Boolean,
      default: true
    }
  },
  approvalRequirements: {
    managerApprovalRequired: {
      type: Boolean,
      default: false
    },
    approvalThreshold: {
      type: Number,
      default: 0,
      min: 0
    },
    receiptRequired: {
      type: Boolean,
      default: true
    },
    allowNoReceiptReturns: {
      type: Boolean,
      default: false
    },
    noReceiptSearchDays: {
      type: Number,
      default: 30,
      min: 1
    }
  },
  restrictions: {
    maxReturnsPerCustomer: {
      enabled: {
        type: Boolean,
        default: false
      },
      count: {
        type: Number,
        default: 5,
        min: 1
      },
      periodDays: {
        type: Number,
        default: 30,
        min: 1
      }
    },
    maxReturnAmount: {
      enabled: {
        type: Boolean,
        default: false
      },
      amount: {
        type: Number,
        default: 10000,
        min: 0
      },
      currency: {
        type: String,
        default: 'LKR'
      }
    },
    excludeCategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    excludeProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }]
  },
  exchangePolicy: {
    allowExchangeSlips: {
      type: Boolean,
      default: true
    },
    exchangeSlipExpiryDays: {
      type: Number,
      default: 90,
      min: 1
    },
    allowPartialExchange: {
      type: Boolean,
      default: true
    }
  },
  stockHandling: {
    autoRestock: {
      type: Boolean,
      default: true
    },
    requireConditionCheck: {
      type: Boolean,
      default: true
    },
    defaultDisposition: {
      type: String,
      enum: ['restock', 'damage', 'write_off'],
      default: 'restock'
    }
  },
  notifications: {
    emailCustomer: {
      type: Boolean,
      default: false
    },
    smsCustomer: {
      type: Boolean,
      default: false
    },
    notifyManager: {
      type: Boolean,
      default: false
    }
  },
  applicableTo: {
    allProducts: {
      type: Boolean,
      default: true
    },
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    customerTypes: [{
      type: String,
      enum: ['retail', 'wholesale', 'vip', 'staff']
    }]
  },
  priority: {
    type: Number,
    default: 1,
    min: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
returnPolicySchema.index({ isActive: 1, priority: 1 });
returnPolicySchema.index({ 'applicableTo.categories': 1 });
returnPolicySchema.index({ 'applicableTo.products': 1 });
returnPolicySchema.index({ createdAt: -1 });

export const ReturnPolicy = mongoose.model('ReturnPolicy', returnPolicySchema);