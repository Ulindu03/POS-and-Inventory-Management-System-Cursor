import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
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
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0
  },
  path: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  icon: {
    type: String
  },
  color: {
    type: String,
    default: '#667eea'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 0
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

// Index for efficient queries
categorySchema.index({ parent: 1, isActive: 1 });
categorySchema.index({ path: 1 });

export const Category = mongoose.model('Category', categorySchema);
