import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  name: {
    en: {
      type: String,
      required: true,
      trim: true
    },
    si: {
      type: String,
      required: true,
      trim: true
    }
  },
  description: {
    en: {
      type: String,
      trim: true
    },
    si: {
      type: String,
      trim: true
    }
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  brand: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    default: 'pcs'
  },
  price: {
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    retail: {
      type: Number,
      required: true,
      min: 0
    },
    wholesale: {
      type: Number,
      min: 0
    }
  },
  discount: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    value: {
      type: Number,
      min: 0,
      default: 0
    },
    startAt: {
      type: Date
    },
    endAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  tax: {
    vat: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    nbt: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  stock: {
    current: {
      type: Number,
      default: 0,
      min: 0
    },
    minimum: {
      type: Number,
      default: 0,
      min: 0
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: 0
    },
    reserved: {
      type: Number,
      default: 0,
      min: 0
    },
    inTransit: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  variants: [{
    name: {
      type: String,
      required: true
    },
    options: [{
      type: String
    }],
    price: {
      type: Number,
      min: 0
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    sku: {
      type: String,
      unique: true,
      sparse: true
    }
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  specifications: {
    weight: {
      type: Number,
      min: 0
    },
    dimensions: {
      length: {
        type: Number,
        min: 0
      },
      width: {
        type: Number,
        min: 0
      },
      height: {
        type: Number,
        min: 0
      }
    },
    material: {
      type: String
    },
    warranty: {
      duration: {
        type: Number,
        min: 0,
        default: 0
      },
      type: {
        type: String,
        enum: ['days', 'months', 'years'],
        default: 'months'
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  trackInventory: {
    type: Boolean,
    default: true
  },
  allowBackorder: {
    type: Boolean,
    default: false
  },
  isDigital: {
    type: Boolean,
    default: false
  },
  isBundle: {
    type: Boolean,
    default: false
  },
  bundleItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  expiryDate: {
    type: Date
  },
  batchNumber: {
    type: String
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  tags: [{
    type: String,
    trim: true
  }],
  // New structured warranty configuration (Phase 1)
  warranty: {
    enabled: { type: Boolean, default: false },
    periodDays: { type: Number, min: 0 },
    type: { type: String, enum: ['manufacturer','extended','lifetime','none'], default: 'manufacturer' },
    coverage: [{ type: String, trim: true }],
    exclusions: [{ type: String, trim: true }],
    termsPdfUrl: { type: String, trim: true },
    allowExtendedUpsell: { type: Boolean, default: false },
    extendedOptions: [{
      name: { type: String, trim: true },
      additionalPeriodDays: { type: Number, min: 1 },
      price: { type: Number, min: 0 },
      sku: { type: String, trim: true }
    }],
    requiresSerial: { type: Boolean, default: false }
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

// Indexes for efficient queries (excluding sku and barcode which are already indexed by unique: true)
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ 'stock.current': 1 });
productSchema.index({ 'price.retail': 1 });
productSchema.index({ tags: 1 });
productSchema.index({ supplier: 1 });
productSchema.index({ 'discount.isEnabled': 1, 'discount.endAt': 1 });

productSchema.pre('save', function productDiscountHooks(next) {
  if (this.isModified('discount') && this.discount) {
    const now = new Date();
    if (!this.discount.createdAt) {
      this.discount.createdAt = now;
    }
    this.discount.updatedAt = now;
  }
  next();
});

export const Product = mongoose.model('Product', productSchema);
