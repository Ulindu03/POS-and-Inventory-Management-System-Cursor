import { Discount } from '../models/Discount.model';

export interface ValidateCodeInput {
  code: string;
  subtotal: number;
  customerId?: string | null;
}

export interface ValidateCodeResult {
  valid: boolean;
  type?: 'percentage' | 'fixed' | 'buy_one_get_one' | 'buy_x_get_y';
  value?: number;
  amount?: number;
  reason?: string;
}

export class DiscountService {
  static async validateCode({ code, subtotal }: ValidateCodeInput): Promise<ValidateCodeResult> {
    const now = new Date();
    const doc = await Discount.findOne({ discountCode: code.toUpperCase(), isActive: true });
    if (!doc) return { valid: false, reason: 'NOT_FOUND' };

    if (doc.startDate && doc.startDate > now) return { valid: false, reason: 'NOT_STARTED' };
    if (doc.endDate && doc.endDate < now) return { valid: false, reason: 'EXPIRED' };
    if (typeof doc.usageLimit === 'number' && typeof doc.usedCount === 'number' && doc.usedCount >= doc.usageLimit) {
      return { valid: false, reason: 'USAGE_LIMIT_REACHED' };
    }

    if (doc.minimumAmount && subtotal < doc.minimumAmount) {
      return { valid: false, reason: 'MIN_NOT_MET' };
    }

    let amount = 0;
    if (doc.type === 'percentage') {
      amount = (subtotal * (doc.value || 0)) / 100;
      if (typeof doc.maximumDiscount === 'number') {
        amount = Math.min(amount, doc.maximumDiscount);
      }
    } else if (doc.type === 'fixed') {
      amount = Math.min(doc.value || 0, subtotal);
    } else {
      // BOGO or BUY_X_GET_Y not evaluated without cart line items
      return { valid: false, reason: 'UNSUPPORTED_RULE' };
    }

    amount = Math.max(0, Math.min(amount, subtotal));
    return { valid: true, type: doc.type, value: doc.value, amount };
  }
}
