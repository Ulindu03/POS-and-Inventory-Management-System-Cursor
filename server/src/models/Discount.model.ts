import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema({
  discountCode: {
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
    enum: ['percentage', 'fixed', 'buy_one_get_one', 'buy_x_get_y'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  minimumAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  maximumDiscount: {
    type: Number,
    min: 0
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  applicableCustomers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  }],
  customerGroups: [{
    type: String,
    enum: ['retail', 'wholesale', 'corporate', 'loyalty']
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    min: 1
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  perCustomerLimit: {
    type: Number,
    default: 1,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFirstTimeOnly: {
    type: Boolean,
    default: false
  },
  isStackable: {
    type: Boolean,
    default: false
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
discountSchema.index({ discountCode: 1 });
discountSchema.index({ isActive: 1 });
discountSchema.index({ startDate: 1, endDate: 1 });
discountSchema.index({ type: 1 });
discountSchema.index({ applicableProducts: 1 });
discountSchema.index({ applicableCategories: 1 });
discountSchema.index({ applicableCustomers: 1 });

export const Discount = mongoose.model('Discount', discountSchema);
