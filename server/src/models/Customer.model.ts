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
    lowercase: true,
    validate: {
      validator: function(v: any) {
        if (v === undefined || v === null) return true;
        const s = String(v).trim();
        if (s === '') return true; // allow empty which will be sanitized away in controllers
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
      },
      message: 'Invalid email format'
    }
  },
  phone: {
    type: String,
    required: function(this: any){ return this.type === 'retail'; },
    trim: true
  },
  // Normalized phone (digits only, leading 0 local format) for lookup
  canonicalPhone: {
    type: String,
    index: true,
    sparse: true
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
  // National Identification Number (added for warranty search requirements)
  nic: {
    type: String,
    trim: true,
    index: true,
    sparse: true
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
// Email may be missing for many customers; use sparse index
customerSchema.index({ email: 1 }, { sparse: true });
customerSchema.index({ type: 1, isActive: 1 });
customerSchema.index({ assignedSalesRep: 1 });
customerSchema.index({ 'address.city': 1 });
customerSchema.index({ tags: 1 });

export const Customer = mongoose.model('Customer', customerSchema);

// Helper to normalize phone numbers into local 0XXXXXXXXX format (Sri Lanka example) or digits fallback
function normalizePhone(raw?: string) {
  if(!raw) return undefined;
  const digits = String(raw).replace(/\D/g,'');
  if(!digits) return undefined;
  if(digits.length === 11 && digits.startsWith('94')) return '0' + digits.slice(2); // +94XXXXXXXXX -> 0XXXXXXXXX
  if(digits.length === 10 && digits.startsWith('0')) return digits;
  return digits; // fallback (store as-is)
}

customerSchema.pre('save', function(next){
  try {
    if(this.phone){
      const norm = normalizePhone(this.phone);
      if(norm) this.canonicalPhone = norm;
    }
    // Enforce phone only for retail
    if(this.type === 'retail' && !this.phone){
      return next(new Error('Phone number required for retail customers'));
    }
    next();
  } catch(e:any){ next(e); }
});
