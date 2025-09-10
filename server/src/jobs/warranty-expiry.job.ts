import { Warranty } from '../models/Warranty.model';

export async function runWarrantyExpiryJob() {
  const now = new Date();
  const toExpire = await Warranty.find({ status: { $in: ['pending_activation','active'] }, endDate: { $lt: now } });
  for (const w of toExpire) {
    w.status = 'expired';
    w.events.push({ type: 'expired', timestamp: now });
    await w.save();
  }
  return { updated: toExpire.length };
}