import mongoose from 'mongoose';

const damageSchema = new mongoose.Schema({
  referenceNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['delivery', 'return', 'warehouse', 'shop_return'],
    required: true
  },
  source: {
    delivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Delivery'
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    location: {
      type: String,
      trim: true
    },
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale'
    }
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
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      enum: ['broken', 'expired', 'defective', 'water_damage', 'crushed', 'torn', 'other'],
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    images: [{
      type: String
    }],
    batchNumber: {
      type: String
    },
    expiryDate: {
      type: Date
    }
  }],
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['reported', 'verified', 'resolved', 'written_off', 'replaced'],
    default: 'reported'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  action: {
    type: String,
    enum: ['replace', 'refund', 'repair', 'write_off', 'return_to_supplier'],
    default: 'write_off'
  },
  replacementItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      min: 1
    }
  }],
  insuranceClaim: {
    filed: {
      type: Boolean,
      default: false
    },
    claimNumber: {
      type: String,
      trim: true
    },
    amount: {
      type: Number,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending'
    }
  },
  weather: {
    condition: {
      type: String,
      enum: ['sunny', 'rainy', 'cloudy', 'stormy']
    },
    temperature: {
      type: Number
    }
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
damageSchema.index({ referenceNo: 1 });
damageSchema.index({ type: 1 });
damageSchema.index({ status: 1 });
damageSchema.index({ reportedBy: 1 });
damageSchema.index({ reportedAt: -1 });
damageSchema.index({ totalCost: 1 });
damageSchema.index({ priority: 1 });

export const Damage = mongoose.model('Damage', damageSchema);
