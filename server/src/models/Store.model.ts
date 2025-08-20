import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  logo: {
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
    country: {
      type: String,
      default: 'Sri Lanka'
    }
  },
  contact: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  business: {
    taxId: {
      type: String,
      trim: true
    },
    registrationNumber: {
      type: String,
      trim: true
    },
    businessType: {
      type: String,
      enum: ['retail', 'wholesale', 'both'],
      default: 'retail'
    }
  },
  operatingHours: {
    monday: {
      open: {
        type: String,
        default: '09:00'
      },
      close: {
        type: String,
        default: '18:00'
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    tuesday: {
      open: {
        type: String,
        default: '09:00'
      },
      close: {
        type: String,
        default: '18:00'
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    wednesday: {
      open: {
        type: String,
        default: '09:00'
      },
      close: {
        type: String,
        default: '18:00'
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    thursday: {
      open: {
        type: String,
        default: '09:00'
      },
      close: {
        type: String,
        default: '18:00'
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    friday: {
      open: {
        type: String,
        default: '09:00'
      },
      close: {
        type: String,
        default: '18:00'
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    saturday: {
      open: {
        type: String,
        default: '09:00'
      },
      close: {
        type: String,
        default: '18:00'
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    sunday: {
      open: {
        type: String,
        default: '10:00'
      },
      close: {
        type: String,
        default: '16:00'
      },
      isOpen: {
        type: Boolean,
        default: false
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
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
storeSchema.index({ code: 1 });
storeSchema.index({ isActive: 1 });
storeSchema.index({ 'business.businessType': 1 });

export const Store = mongoose.model('Store', storeSchema);
