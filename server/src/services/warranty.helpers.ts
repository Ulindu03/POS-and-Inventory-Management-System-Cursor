import { WarrantyClaim } from '../models/WarrantyClaim.model';
import { Warranty } from '../models/Warranty.model';

export async function fraudHeuristicsOnClaim(warrantyId: string, customerId: string, config: { thresholdClaims: number; windowDays: number }) {
  const windowStart = new Date(Date.now() - config.windowDays * 86400000);
  const recentClaims = await WarrantyClaim.countDocuments({ customer: customerId, createdAt: { $gte: windowStart } });
  const flags: { type: string; reason: string; detectedAt: Date }[] = [];
  if (recentClaims >= config.thresholdClaims) {
    flags.push({ type: 'excessive_claims', reason: `>=${config.thresholdClaims} within ${config.windowDays}d`, detectedAt: new Date() });
  }
  const w = await Warranty.findById(warrantyId).lean();
  if (w && new Date() > new Date(w.endDate)) {
    flags.push({ type: 'post_expiry', reason: 'Claim after warranty expiry', detectedAt: new Date() });
  }
  return flags;
}