import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  module: {
    type: String,
    enum: ['auth', 'products', 'sales', 'inventory', 'customers', 'suppliers', 'delivery', 'damage', 'reports', 'settings'],
    required: true
  },
  entity: {
    type: String,
    trim: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['success', 'error', 'warning', 'info'],
    default: 'success'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  sessionId: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
activityLogSchema.index({ user: 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ module: 1 });
activityLogSchema.index({ entityId: 1 });
activityLogSchema.index({ status: 1 });
activityLogSchema.index({ severity: 1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ sessionId: 1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
