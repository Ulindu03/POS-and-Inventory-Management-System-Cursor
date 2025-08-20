import mongoose from 'mongoose';

const warrantySchema = new mongoose.Schema({
  warrantyNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  serialNumber: {
    type: String,
    trim: true
  },
  warrantyType: {
    type: String,
    enum: ['manufacturer', 'extended', 'premium'],
    default: 'manufacturer'
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  durationUnit: {
    type: String,
    enum: ['days', 'months', 'years'],
    default: 'months'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  terms: {
    type: String,
    trim: true
  },
  coverage: [{
    type: String,
    trim: true
  }],
  exclusions: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'claimed'],
    default: 'active'
  },
  claims: [{
    claimNo: {
      type: String,
      required: true,
      trim: true
    },
    issue: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    reportedDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending'
    },
    action: {
      type: String,
      enum: ['repair', 'replace', 'refund'],
      default: 'repair'
    },
    cost: {
      type: Number,
      min: 0
    },
    notes: {
      type: String,
      trim: true
    },
    resolvedDate: {
      type: Date
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
warrantySchema.index({ warrantyNo: 1 });
warrantySchema.index({ product: 1 });
warrantySchema.index({ customer: 1 });
warrantySchema.index({ sale: 1 });
warrantySchema.index({ status: 1 });
warrantySchema.index({ endDate: 1 });
warrantySchema.index({ serialNumber: 1 });

export const Warranty = mongoose.model('Warranty', warrantySchema);
