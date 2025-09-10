import { Warranty } from '../models/Warranty.model';
import { WarrantyClaim } from '../models/WarrantyClaim.model';

export async function runWarrantyReportJob() {
  const [active, expired, claimsCount] = await Promise.all([
    Warranty.countDocuments({ status: 'active' }),
    Warranty.countDocuments({ status: 'expired' }),
    WarrantyClaim.countDocuments({})
  ]);
  return { active, expired, claimsCount, generatedAt: new Date() };
}