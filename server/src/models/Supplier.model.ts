import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  supplierCode: {
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
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  alternatePhone: {
    type: String,
    trim: true
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    province: {
      type: String,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    }
  },
  taxId: {
    type: String,
    trim: true
  },
  paymentTerms: {
    type: String,
    default: '30 days'
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  creditUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  performance: {
    onTimeDelivery: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    qualityRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    priceCompetitiveness: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  },
  bankDetails: {
    accountName: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    branch: {
      type: String,
      trim: true
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
supplierSchema.index({ supplierCode: 1 });
supplierSchema.index({ name: 1 });
supplierSchema.index({ email: 1 });
supplierSchema.index({ phone: 1 });
supplierSchema.index({ status: 1, isActive: 1 });
supplierSchema.index({ categories: 1 });

export const Supplier = mongoose.model('Supplier', supplierSchema);
