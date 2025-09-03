import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerCode: {
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
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
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
    },
    coordinates: {
      latitude: {
        type: Number
      },
      longitude: {
        type: Number
      }
    }
  },
  type: {
    type: String,
    enum: ['retail', 'wholesale', 'corporate'],
    default: 'retail'
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
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  taxId: {
    type: String,
    trim: true
  },
  birthday: {
    type: Date
  },
  anniversary: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  preferences: {
    language: {
      type: String,
      enum: ['en', 'si'],
      default: 'en'
    },
    currency: {
      type: String,
      default: 'LKR'
    },
    communication: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      whatsapp: {
        type: Boolean,
        default: false
      }
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
  assignedSalesRep: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [{
    type: String,
    trim: true
  }],
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

// Indexes for efficient queries (excluding customerCode which is already indexed by unique: true)
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ type: 1, isActive: 1 });
customerSchema.index({ assignedSalesRep: 1 });
customerSchema.index({ 'address.city': 1 });
customerSchema.index({ tags: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
