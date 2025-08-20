import mongoose from 'mongoose';

const taxSchema = new mongoose.Schema({
  taxCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['vat', 'nbt', 'custom', 'import', 'export'],
    required: true
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  isCompound: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  registrationNumber: {
    type: String,
    trim: true
  },
  taxAuthority: {
    type: String,
    trim: true
  },
  reportingFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'annually'],
    default: 'monthly'
  },
  lastReported: {
    type: Date
  },
  nextReportingDate: {
    type: Date
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
taxSchema.index({ taxCode: 1 });
taxSchema.index({ type: 1 });
taxSchema.index({ isActive: 1 });
taxSchema.index({ rate: 1 });
taxSchema.index({ applicableProducts: 1 });
taxSchema.index({ applicableCategories: 1 });

export const Tax = mongoose.model('Tax', taxSchema);
