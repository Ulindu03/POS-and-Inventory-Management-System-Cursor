import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
  tripNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
  lorry: { vehicleNo: { type: String, required: true, trim: true, uppercase: true }, capacity: { type: Number, default: 0 } },
  driver: { name: { type: String, required: true }, phone: { type: String, required: true }, licenseNo: { type: String } },
  salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  routeName: { type: String, trim: true },
  status: { type: String, enum: ['planned', 'loading', 'in_transit', 'completed', 'cancelled'], default: 'planned' },
  plannedStart: { type: Date },
  plannedEnd: { type: Date },
  actualStart: { type: Date },
  actualEnd: { type: Date },
  stops: [{
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    sequence: { type: Number, default: 0 },
    scheduledTime: { type: Date },
    arrivalTime: { type: Date },
    departureTime: { type: Date },
    status: { type: String, enum: ['pending', 'arrived', 'delivered', 'partial', 'skipped', 'failed'], default: 'pending' },
    manifest: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, qty: { type: Number, required: true, min: 0 } }],
    delivered: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, qty: { type: Number, required: true, min: 0 }, damaged: { type: Number, default: 0, min: 0 }, returned: { type: Number, default: 0, min: 0 } }],
    notes: { type: String, trim: true },
  }],
  totals: { loaded: { type: Number, default: 0 }, delivered: { type: Number, default: 0 }, returned: { type: Number, default: 0 }, damaged: { type: Number, default: 0 } },
}, { timestamps: true });

tripSchema.index({ status: 1 });
tripSchema.index({ plannedStart: 1 });
tripSchema.index({ 'lorry.vehicleNo': 1 });

export const Trip = mongoose.model('Trip', tripSchema);
