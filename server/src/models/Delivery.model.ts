import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema({
  deliveryNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  lorryDetails: {
    vehicleNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    driverName: {
      type: String,
      required: true,
      trim: true
    },
    driverPhone: {
      type: String,
      required: true,
      trim: true
    },
    driverLicense: {
      type: String,
      trim: true
    }
  },
  salesRep: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  route: {
    type: String,
    trim: true
  },
  shops: [{
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
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
      delivered: {
        type: Number,
        default: 0,
        min: 0
      },
      damaged: {
        type: Number,
        default: 0,
        min: 0
      },
      returned: {
        type: Number,
        default: 0,
        min: 0
      },
      notes: {
        type: String,
        trim: true
      }
    }],
    status: {
      type: String,
      enum: ['pending', 'delivered', 'partial', 'failed', 'returned'],
      default: 'pending'
    },
    deliveryTime: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    },
    signature: {
      type: String
    },
    proofOfDelivery: {
      type: String
    }
  }],
  damages: [{
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
    reason: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['transit', 'defective', 'expired', 'broken', 'water_damage', 'other'],
      required: true
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    images: [{
      type: String
    }],
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in_transit', 'completed', 'cancelled', 'returned'],
    default: 'scheduled'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  departureTime: {
    type: Date
  },
  arrivalTime: {
    type: Date
  },
  totalItems: {
    type: Number,
    default: 0
  },
  totalDelivered: {
    type: Number,
    default: 0
  },
  totalDamaged: {
    type: Number,
    default: 0
  },
  totalReturned: {
    type: Number,
    default: 0
  },
  deliveryCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  fuelCost: {
    type: Number,
    default: 0,
    min: 0
  },
  otherExpenses: {
    type: Number,
    default: 0,
    min: 0
  },
  totalExpenses: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true
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

// Indexes for efficient queries (deliveryNo already indexed via unique: true)
deliverySchema.index({ 'lorryDetails.vehicleNo': 1 });
deliverySchema.index({ 'lorryDetails.driverName': 1 });
deliverySchema.index({ salesRep: 1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ scheduledDate: 1 });
deliverySchema.index({ createdAt: -1 });

export const Delivery = mongoose.model('Delivery', deliverySchema);
