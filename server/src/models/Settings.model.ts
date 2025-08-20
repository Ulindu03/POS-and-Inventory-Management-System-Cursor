import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  pos: {
    defaultCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    allowNegativeStock: {
      type: Boolean,
      default: false
    },
    requireCustomer: {
      type: Boolean,
      default: false
    },
    printAfterSale: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    autoHoldSales: {
      type: Boolean,
      default: true
    },
    holdTimeout: {
      type: Number,
      default: 30, // minutes
      min: 1
    }
  },
  tax: {
    vat: {
      enabled: {
        type: Boolean,
        default: true
      },
      rate: {
        type: Number,
        default: 15,
        min: 0,
        max: 100
      }
    },
    nbt: {
      enabled: {
        type: Boolean,
        default: true
      },
      rate: {
        type: Number,
        default: 2,
        min: 0,
        max: 100
      }
    }
  },
  receipt: {
    header: {
      type: String,
      trim: true
    },
    footer: {
      type: String,
      trim: true
    },
    showLogo: {
      type: Boolean,
      default: true
    },
    paperSize: {
      type: String,
      enum: ['58mm', '80mm', 'a4'],
      default: '80mm'
    },
    showTaxDetails: {
      type: Boolean,
      default: true
    },
    showBarcode: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      enum: ['en', 'si', 'both'],
      default: 'en'
    }
  },
  inventory: {
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0
    },
    criticalStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },
    autoReorder: {
      type: Boolean,
      default: false
    },
    trackExpiry: {
      type: Boolean,
      default: true
    },
    expiryWarningDays: {
      type: Number,
      default: 30,
      min: 1
    }
  },
  delivery: {
    defaultDeliveryCharges: {
      type: Number,
      default: 0,
      min: 0
    },
    requireProofOfDelivery: {
      type: Boolean,
      default: true
    },
    autoAssignDrivers: {
      type: Boolean,
      default: false
    },
    routeOptimization: {
      type: Boolean,
      default: false
    }
  },
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      lowStock: {
        type: Boolean,
        default: true
      },
      dailyReports: {
        type: Boolean,
        default: true
      },
      deliveryUpdates: {
        type: Boolean,
        default: true
      }
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      lowStock: {
        type: Boolean,
        default: false
      },
      deliveryUpdates: {
        type: Boolean,
        default: false
      }
    }
  },
  backup: {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    time: {
      type: String,
      default: '02:00'
    },
    retention: {
      type: Number,
      default: 30, // days
      min: 1
    }
  },
  security: {
    sessionTimeout: {
      type: Number,
      default: 30, // minutes
      min: 5
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
      min: 1
    },
    requireTwoFactor: {
      type: Boolean,
      default: false
    },
    passwordPolicy: {
      minLength: {
        type: Number,
        default: 8,
        min: 6
      },
      requireUppercase: {
        type: Boolean,
        default: true
      },
      requireLowercase: {
        type: Boolean,
        default: true
      },
      requireNumbers: {
        type: Boolean,
        default: true
      },
      requireSpecialChars: {
        type: Boolean,
        default: false
      }
    }
  },
  currency: {
    primary: {
      type: String,
      default: 'LKR'
    },
    symbol: {
      type: String,
      default: 'Rs.'
    },
    position: {
      type: String,
      enum: ['before', 'after'],
      default: 'before'
    },
    decimalPlaces: {
      type: Number,
      default: 2,
      min: 0,
      max: 4
    }
  },
  language: {
    default: {
      type: String,
      enum: ['en', 'si'],
      default: 'en'
    },
    available: [{
      type: String,
      enum: ['en', 'si']
    }]
  },
  timezone: {
    type: String,
    default: 'Asia/Colombo'
  },
  dateFormat: {
    type: String,
    default: 'DD/MM/YYYY'
  },
  timeFormat: {
    type: String,
    enum: ['12h', '24h'],
    default: '24h'
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
settingsSchema.index({ 'pos.allowNegativeStock': 1 });
settingsSchema.index({ 'inventory.lowStockThreshold': 1 });
settingsSchema.index({ 'backup.enabled': 1 });

export const Settings = mongoose.model('Settings', settingsSchema);
