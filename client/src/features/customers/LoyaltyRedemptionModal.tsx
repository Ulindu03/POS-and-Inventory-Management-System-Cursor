import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/common/Card';
import { 
  Star, 
  Gift, 
  DollarSign, 
  Percent, 
  // Save, 
  X, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const redemptionSchema = z.object({
  points: z.number().min(1, 'Points must be at least 1'),
  redemptionType: z.enum(['discount', 'cashback', 'gift', 'other']),
  description: z.string().min(3, 'Description must be at least 3 characters')
});

type RedemptionFormData = z.infer<typeof redemptionSchema>;

interface Customer {
  _id: string;
  name: string;
  loyaltyPoints: number;
}

interface LoyaltyRedemptionModalProps {
  customer: Customer;
  onRedeem: (data: RedemptionFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const redemptionTypes = [
  {
    value: 'discount',
    label: 'Discount',
    icon: Percent,
    description: 'Apply discount to next purchase',
    color: 'text-green-600 bg-green-100'
  },
  {
    value: 'cashback',
    label: 'Cash Back',
    icon: DollarSign,
    description: 'Convert points to cash value',
    color: 'text-blue-600 bg-blue-100'
  },
  {
    value: 'gift',
    label: 'Gift Card',
    icon: Gift,
    description: 'Redeem for gift card',
    color: 'text-purple-600 bg-purple-100'
  },
  {
    value: 'other',
    label: 'Other',
    icon: Star,
    description: 'Other redemption type',
    color: 'text-orange-600 bg-orange-100'
  }
];

export const LoyaltyRedemptionModal: React.FC<LoyaltyRedemptionModalProps> = ({
  customer,
  onRedeem,
  onCancel,
  isLoading = false
}) => {
  const [selectedType, setSelectedType] = useState<string>('discount');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue
  } = useForm<RedemptionFormData>({
    resolver: zodResolver(redemptionSchema),
    defaultValues: {
      points: 0,
      redemptionType: 'discount',
      description: ''
    }
  });

  const pointsToRedeem = watch('points');
  const redemptionType = watch('redemptionType');

  // Calculate redemption value (example: 100 points = $1)
  const calculateRedemptionValue = (points: number) => {
    return (points / 100).toFixed(2);
  };

  const handleFormSubmit = async (data: RedemptionFormData) => {
    if (data.points > customer.loyaltyPoints) {
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmRedeem = async () => {
    const formData = {
      points: pointsToRedeem,
      redemptionType: selectedType,
      description: watch('description')
    };
    await onRedeem({
      ...formData,
      redemptionType: formData.redemptionType as "other" | "discount" | "cashback" | "gift"
    });
    setShowConfirmation(false);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg text-white">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Redeem Loyalty Points
                </h2>
                <p className="text-gray-600">
                  {customer.name} - {customer.loyaltyPoints.toLocaleString()} points available
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {!showConfirmation ? (
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
              {/* Points Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Points to Redeem *
                </label>
                <div className="relative">
                  <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...register('points', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max={customer.loyaltyPoints}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    placeholder="Enter points to redeem"
                  />
                </div>
                {errors.points && (
                  <p className="mt-1 text-sm text-red-600">{errors.points.message}</p>
                )}
                {pointsToRedeem > customer.loyaltyPoints && (
                  <p className="mt-1 text-sm text-red-600">
                    Cannot redeem more points than available
                  </p>
                )}
                {pointsToRedeem > 0 && (
                  <p className="mt-1 text-sm text-gray-600">
                    Estimated value: ${calculateRedemptionValue(pointsToRedeem)}
                  </p>
                )}
              </div>

              {/* Redemption Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Redemption Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {redemptionTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setSelectedType(type.value);
                          setValue('redemptionType', type.value as any);
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selectedType === type.value
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${type.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">{type.label}</h4>
                            <p className="text-sm text-gray-600">{type.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.redemptionType && (
                  <p className="mt-1 text-sm text-red-600">{errors.redemptionType.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all resize-none"
                  placeholder="Describe the redemption reason..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Summary */}
              {pointsToRedeem > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-200">
                  <h4 className="font-semibold text-gray-800 mb-2">Redemption Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Points to redeem:</span>
                      <span className="font-semibold">{pointsToRedeem.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining points:</span>
                      <span className="font-semibold">
                        {(customer.loyaltyPoints - pointsToRedeem).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated value:</span>
                      <span className="font-semibold text-green-600">
                        ${calculateRedemptionValue(pointsToRedeem)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValid || isLoading || pointsToRedeem > customer.loyaltyPoints || pointsToRedeem <= 0}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Gift className="w-5 h-5" />
                  {isLoading ? 'Processing...' : 'Redeem Points'}
                </button>
              </div>
            </form>
          ) : (
            /* Confirmation Dialog */
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Confirm Redemption
                </h3>
                <p className="text-gray-600">
                  Are you sure you want to redeem {pointsToRedeem.toLocaleString()} points?
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-3">Redemption Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-semibold">{customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Points:</span>
                    <span className="font-semibold">{pointsToRedeem.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-semibold capitalize">{redemptionType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Value:</span>
                    <span className="font-semibold text-green-600">
                      ${calculateRedemptionValue(pointsToRedeem)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRedeem}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {isLoading ? 'Processing...' : 'Confirm Redemption'}
                </button>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};
