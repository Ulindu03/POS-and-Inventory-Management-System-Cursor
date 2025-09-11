import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/common/Card';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Star, 
  Calendar,
  ShoppingCart,
  TrendingUp,
  Edit,
  X,
  Building,
  Users,
  ShoppingBag,
  Award,
  // Clock,
  DollarSign,
  Gift
} from 'lucide-react';
import { formatLKR } from '@/lib/utils/currency';
import { AreaChart } from '@/components/common/Charts';
import { LoyaltyRedemptionModal } from './LoyaltyRedemptionModal';

interface Customer {
  _id: string;
  customerCode: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  type: 'retail' | 'wholesale' | 'corporate';
  creditLimit: number;
  creditUsed: number;
  loyaltyPoints: number;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  taxId?: string;
  birthday?: string;
  notes?: string;
  totalPurchases?: number;
  totalSpent?: number;
  lastPurchase?: string;
  isActive: boolean;
  createdAt: string;
}

interface Purchase {
  _id: string;
  invoiceNo: string;
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  items: Array<{
    product: string;
    quantity: number;
    price: number;
  }>;
}

interface CustomerProfileProps {
  customer: Customer;
  purchases: Purchase[];
  onEdit: () => void;
  onClose: () => void;
  onRedeemPoints?: (data: any) => Promise<void>;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({
  customer,
  purchases,
  onEdit,
  onClose,
  onRedeemPoints
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'loyalty'>('overview');
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'retail': return <Users className="w-5 h-5" />;
      case 'wholesale': return <Building className="w-5 h-5" />;
      case 'corporate': return <ShoppingBag className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'retail': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'wholesale': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'corporate': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCreditStatus = (used: number, limit: number) => {
    if (limit === 0) return { color: 'text-gray-500', text: 'No Credit', bg: 'bg-gray-100' };
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return { color: 'text-red-600', text: 'Critical', bg: 'bg-red-100' };
    if (percentage >= 75) return { color: 'text-orange-600', text: 'High', bg: 'bg-orange-100' };
    if (percentage >= 50) return { color: 'text-yellow-600', text: 'Medium', bg: 'bg-yellow-100' };
    return { color: 'text-green-600', text: 'Good', bg: 'bg-green-100' };
  };

  const getLoyaltyTier = (points: number) => {
    if (points >= 10000) return { name: 'Platinum', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (points >= 5000) return { name: 'Gold', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (points >= 1000) return { name: 'Silver', color: 'text-gray-600', bg: 'bg-gray-100' };
    return { name: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-100' };
  };

  const purchaseHistoryData = purchases.slice(-7).map(purchase => ({
    name: new Date(purchase.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: purchase.total
  }));

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'purchases', label: 'Purchase History', icon: ShoppingCart },
    { id: 'loyalty', label: 'Loyalty & Rewards', icon: Star }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <GlassCard variant="dark" className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 text-[#EDEDED]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl text-white">
                {getTypeIcon(customer.type)}
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#F5F5F5' }}>{customer.name}</h2>
                <p className="" style={{ color: '#BBBBBB' }}>{customer.customerCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onEdit}
                className="px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                style={{ backgroundColor: '#353535', color: '#EDEDED' }}
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => setShowRedemptionModal(true)}
                className="px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                style={{ backgroundColor: '#353535', color: '#FFD966' }}
              >
                <Gift className="w-4 h-4" />
                Redeem Points
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#C9C9C9' }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Customer Type Badge */}
          <div className="mb-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${getTypeColor(customer.type)}`}>
              {getTypeIcon(customer.type)}
              {customer.type.charAt(0).toUpperCase() + customer.type.slice(1)} Customer
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b mb-6" style={{ borderColor: '#353535' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 border-b-2 font-medium transition-colors flex items-center gap-2`}
                  style={{
                    borderColor: activeTab === tab.id ? '#FFD966' : 'transparent',
                    color: activeTab === tab.id ? '#FFD966' : '#BBBBBB'
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard variant="darkSubtle" className="p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#EDEDED' }}>
                      <User className="w-5 h-5" />
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                        <span style={{ color: '#E0E0E0' }}>{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                        <span style={{ color: '#E0E0E0' }}>{customer.phone}</span>
                      </div>
                      {customer.alternatePhone && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                          <span style={{ color: '#E0E0E0' }}>{customer.alternatePhone}</span>
                        </div>
                      )}
                      {customer.birthday && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                          <span style={{ color: '#E0E0E0' }}>
                            {new Date(customer.birthday).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </GlassCard>

                  <GlassCard variant="darkSubtle" className="p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#EDEDED' }}>
                      <MapPin className="w-5 h-5" />
                      Address
                    </h3>
                    <div className="space-y-2" style={{ color: '#E0E0E0' }}>
                      <p>{customer.address.street}</p>
                      <p>{customer.address.city}, {customer.address.province}</p>
                      <p>{customer.address.postalCode}</p>
                    </div>
                  </GlassCard>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border" style={{ backgroundColor: '#2B2B2B', borderColor: '#353535' }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: '#353535' }}>
                        <ShoppingCart className="w-5 h-5" style={{ color: '#FFD966' }} />
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: '#BBBBBB' }}>Total Purchases</p>
                        <p className="text-2xl font-bold" style={{ color: '#FFD966' }}>{customer.totalPurchases}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border" style={{ backgroundColor: '#2B2B2B', borderColor: '#353535' }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: '#353535' }}>
                        <DollarSign className="w-5 h-5" style={{ color: '#86EFAC' }} />
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: '#BBBBBB' }}>Total Spent</p>
                        <p className="text-2xl font-bold" style={{ color: '#86EFAC' }}>{formatLKR(customer.totalSpent ?? 0)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border" style={{ backgroundColor: '#2B2B2B', borderColor: '#353535' }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: '#353535' }}>
                        <Star className="w-5 h-5" style={{ color: '#FFD966' }} />
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: '#BBBBBB' }}>Loyalty Points</p>
                        <p className="text-2xl font-bold" style={{ color: '#FFD966' }}>{customer.loyaltyPoints.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border" style={{ backgroundColor: '#2B2B2B', borderColor: '#353535' }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: '#353535' }}>
                        <TrendingUp className="w-5 h-5" style={{ color: '#86EFAC' }} />
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: '#BBBBBB' }}>Member Since</p>
                        <p className="text-2xl font-bold" style={{ color: '#86EFAC' }}>
                          {new Date(customer.createdAt).getFullYear()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credit Status */}
                {customer.creditLimit > 0 && (
                  <GlassCard variant="darkSubtle" className="p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#EDEDED' }}>
                      <CreditCard className="w-5 h-5" />
                      Credit Status
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span style={{ color: '#BBBBBB' }}>Credit Used:</span>
                        <span className="font-semibold">
                          {formatLKR(customer.creditUsed)} / {formatLKR(customer.creditLimit)}
                        </span>
                      </div>
                      <div className="w-full rounded-full h-3" style={{ backgroundColor: '#353535' }}>
                        <div 
                          className="h-3 rounded-full transition-all"
                          style={{ width: `${Math.min((customer.creditUsed / customer.creditLimit) * 100, 100)}%`, background: 'linear-gradient(90deg,#FFD966,#86EFAC)' }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: '#BBBBBB' }}>Available Credit:</span>
                        <span className="font-semibold" style={{ color: '#86EFAC' }}>
                          {formatLKR(customer.creditLimit - customer.creditUsed)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCreditStatus(customer.creditUsed, customer.creditLimit).bg} ${getCreditStatus(customer.creditUsed, customer.creditLimit).color}`}>
                          {getCreditStatus(customer.creditUsed, customer.creditLimit).text}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Notes */}
                {customer.notes && (
                  <GlassCard variant="darkSubtle" className="p-4">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: '#EDEDED' }}>Notes</h3>
                    <p style={{ color: '#E0E0E0' }}>{customer.notes}</p>
                  </GlassCard>
                )}
              </motion.div>
            )}

            {activeTab === 'purchases' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Purchase Chart */}
                <GlassCard variant="darkSubtle" className="p-4">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: '#EDEDED' }}>Purchase Trend (Last 7)</h3>
                  <AreaChart data={purchaseHistoryData} height={200} cardVariant="darkSubtle" stroke="#FFD966" />
                </GlassCard>

                {/* Purchase List */}
                <GlassCard variant="darkSubtle" className="p-4">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: '#EDEDED' }}>Recent Purchases</h3>
                  <div className="space-y-3">
                    {purchases.length > 0 ? (
                      purchases.slice(0, 10).map((purchase) => (
                        <div key={purchase._id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#2B2B2B' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#353535' }}>
                              <ShoppingCart className="w-5 h-5" style={{ color: '#FFD966' }} />
                            </div>
                            <div>
                              <p className="font-semibold" style={{ color: '#F5F5F5' }}>{purchase.invoiceNo}</p>
                              <p className="text-sm" style={{ color: '#BBBBBB' }}>
                                {new Date(purchase.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold" style={{ color: '#F5F5F5' }}>{formatLKR(purchase.total)}</p>
                            {(() => {
                              const getStatusClass = (status: string) => {
                                if (status === 'completed') return 'bg-green-100 text-green-700';
                                if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
                                return 'bg-red-100 text-red-700';
                              };
                              return (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(purchase.status)}`}>
                                  {purchase.status}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                        No purchase history available
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'loyalty' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Loyalty Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-600" />
                      Current Status
                    </h3>
                    <div className="text-center">
                      <div className={`inline-block p-4 rounded-full ${getLoyaltyTier(customer.loyaltyPoints).bg} mb-4`}>
                        <Award className={`w-12 h-12 ${getLoyaltyTier(customer.loyaltyPoints).color}`} />
                      </div>
                      <h4 className={`text-2xl font-bold ${getLoyaltyTier(customer.loyaltyPoints).color}`}>
                        {getLoyaltyTier(customer.loyaltyPoints).name}
                      </h4>
                      <p className="text-gray-600 mt-2">
                        {customer.loyaltyPoints.toLocaleString()} points
                      </p>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Next Tier</h3>
                    <div className="space-y-3">
                      {customer.loyaltyPoints < 1000 && (
                        <div className="text-center">
                          <p className="text-gray-600 mb-2">Silver Tier</p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full transition-all"
                              style={{ width: `${(customer.loyaltyPoints / 1000) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {1000 - customer.loyaltyPoints} points to Silver
                          </p>
                        </div>
                      )}
                      {customer.loyaltyPoints >= 1000 && customer.loyaltyPoints < 5000 && (
                        <div className="text-center">
                          <p className="text-gray-600 mb-2">Gold Tier</p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full transition-all"
                              style={{ width: `${((customer.loyaltyPoints - 1000) / 4000) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {5000 - customer.loyaltyPoints} points to Gold
                          </p>
                        </div>
                      )}
                      {customer.loyaltyPoints >= 5000 && customer.loyaltyPoints < 10000 && (
                        <div className="text-center">
                          <p className="text-gray-600 mb-2">Platinum Tier</p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all"
                              style={{ width: `${((customer.loyaltyPoints - 5000) / 5000) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {10000 - customer.loyaltyPoints} points to Platinum
                          </p>
                        </div>
                      )}
                      {customer.loyaltyPoints >= 10000 && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">🏆 Platinum Achieved!</p>
                          <p className="text-gray-600 mt-2">Maximum tier reached</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </div>

                {/* Benefits */}
                <GlassCard className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Tier Benefits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Star className="w-6 h-6 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-2">Bronze</h4>
                      <p className="text-sm text-gray-600">Basic rewards & discounts</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Star className="w-6 h-6 text-yellow-600" />
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-2">Silver</h4>
                      <p className="text-sm text-gray-600">Enhanced rewards & priority support</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Star className="w-6 h-6 text-purple-600" />
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-2">Gold</h4>
                      <p className="text-sm text-gray-600">Premium rewards & VIP treatment</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Loyalty Redemption Modal */}
      {showRedemptionModal && onRedeemPoints && (
        <LoyaltyRedemptionModal
          customer={customer}
          onRedeem={async (data) => {
            await onRedeemPoints(data);
            setShowRedemptionModal(false);
          }}
          onCancel={() => setShowRedemptionModal(false)}
        />
      )}
    </motion.div>
  );
};
