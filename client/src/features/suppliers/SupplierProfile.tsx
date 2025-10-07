import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Building, 
  Calendar, 
  DollarSign, 
  Package, 
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Eye
} from 'lucide-react';
import { Supplier } from '@/lib/api/suppliers.api';
import { formatLKR } from '@/lib/utils/currency';

interface SupplierProfileProps {
  supplier: Supplier;
  onEdit?: (supplier: Supplier) => void;
  onView?: (supplier: Supplier) => void;
}

const SupplierProfile: React.FC<SupplierProfileProps> = ({ 
  supplier, 
  onEdit, 
  onView 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'payments' | 'performance'>('overview');

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-4 h-4" />;
    if (score >= 70) return <Clock className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Fallbacks for missing fields
  const address = supplier.address || {};
  const performance = supplier.performance || {};

  return (
  <div className="bg-[#2a2a2a] rounded-2xl shadow-lg border border-gray-900">
      {/* Header */}
  <div className="p-8 border-b border-gray-800 bg-[#232323] rounded-t-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400/20 to-purple-400/10 rounded-2xl flex items-center justify-center shadow-md">
              <Building className="w-10 h-10 text-blue-500" />
            </div>
            <div>
                <h2 className="text-3xl font-extrabold text-gray-100 tracking-tight mb-1">{supplier.name}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-semibold tracking-wide">Code: {supplier.supplierCode}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold tracking-wide border ${getStatusColor(supplier.status)}`}>{supplier.status}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            {onEdit && (
              <button
                onClick={() => onEdit(supplier)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
                title="Edit Supplier"
              >
                <Edit className="w-5 h-5" /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
  <div className="p-8 border-b border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-2xl bg-[#232b3b] p-5 shadow flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/10 p-3 rounded-xl">
                <Package className="w-7 h-7 text-blue-500" />
              </div>
              <div>
                <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Orders</div>
                <div className="text-2xl font-extrabold text-blue-900">{supplier.totalOrders || 0}</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-[#233b2b] p-5 shadow flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-3 rounded-xl">
                <DollarSign className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Total Spent</div>
                <div className="text-2xl font-extrabold text-green-900">{formatLKR(supplier.totalSpent || 0)}</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-[#3b3923] p-5 shadow flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/10 p-3 rounded-xl">
                <AlertTriangle className="w-7 h-7 text-yellow-500" />
              </div>
              <div>
                <div className="text-xs text-yellow-300 font-semibold uppercase tracking-wide">Outstanding</div>
                <div className="text-2xl font-extrabold text-yellow-200">{formatLKR(supplier.outstandingBalance || 0)}</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-[#2b233b] p-5 shadow flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/10 p-3 rounded-xl">
                <Package className="w-7 h-7 text-purple-500" />
              </div>
              <div>
                <div className="text-xs text-purple-300 font-semibold uppercase tracking-wide">Products</div>
                <div className="text-2xl font-extrabold text-purple-200">{supplier.productCount || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
  <div className="border-b border-gray-800 bg-[#232323] rounded-t-2xl text-gray-100">
        <nav className="flex space-x-8 px-8">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'orders', label: 'Recent Orders', icon: Package },
            { id: 'payments', label: 'Payments', icon: DollarSign },
            { id: 'performance', label: 'Performance', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-3 border-b-4 font-semibold text-base flex items-center gap-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-400 text-blue-200 bg-blue-900/30 shadow'
                  : 'border-transparent text-gray-400 hover:text-blue-300 hover:border-blue-400'
              }`}
              style={{ borderRadius: '0.75rem 0.75rem 0 0' }}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-[#232323] rounded-xl p-6 shadow-sm mb-2 text-gray-100">
              <h3 className="text-lg font-bold text-blue-200 mb-4 flex items-center gap-2"><Phone className="w-5 h-5 text-blue-300" />Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-gray-200">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span>{supplier.phone || <span className='text-gray-400'>N/A</span>}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-200">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span>{supplier.email || <span className='text-gray-400'>N/A</span>}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-200">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className='text-gray-400'>N/A</span>
                </div>
                <div className="flex items-center gap-3 text-gray-200">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span>{address.city || <span className='text-gray-400'>N/A</span>}, {address.province || <span className='text-gray-400'>N/A</span>}</span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-[#232323] rounded-xl p-6 shadow-sm mb-2 text-gray-100">
              <h3 className="text-lg font-bold text-purple-200 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-300" />Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-green-900 via-green-800 to-green-700 p-5 rounded-2xl shadow flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-green-200 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-300" />On-Time Delivery</span>
                    <div className={`flex items-center gap-1 ${getPerformanceColor(performance.onTimeDelivery || 0)}`}>
                      {getPerformanceIcon(performance.onTimeDelivery || 0)}
                      <span className="text-base font-bold text-green-100">{performance.onTimeDelivery != null ? performance.onTimeDelivery : 0}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-green-700/60 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all bg-gradient-to-r from-green-400 via-green-500 to-green-300"
                      style={{ width: `${performance.onTimeDelivery || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 p-5 rounded-2xl shadow flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-200 flex items-center gap-2"><Star className="w-4 h-4 text-blue-300" />Quality Rating</span>
                    <div className={`flex items-center gap-1 ${getPerformanceColor(performance.qualityRating || 0)}`}>
                      {getPerformanceIcon(performance.qualityRating || 0)}
                      <span className="text-base font-bold text-blue-100">{performance.qualityRating != null ? performance.qualityRating : 0}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-blue-700/60 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all bg-gradient-to-r from-blue-400 via-blue-500 to-blue-300"
                      style={{ width: `${performance.qualityRating || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-[#232323] rounded-xl p-6 shadow-sm text-gray-100">
              <h3 className="text-lg font-bold text-green-200 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-300" />Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-start gap-2 bg-green-900/60 rounded-xl p-4 shadow">
                  <span className="text-xs text-green-200 font-semibold flex items-center gap-1"><DollarSign className="w-4 h-4 text-green-300" />Credit Limit</span>
                  <span className="text-xl font-extrabold text-green-100">{formatLKR(supplier.creditLimit || 0)}</span>
                </div>
                <div className="flex flex-col items-start gap-2 bg-blue-900/60 rounded-xl p-4 shadow">
                  <span className="text-xs text-blue-200 font-semibold flex items-center gap-1"><Clock className="w-4 h-4 text-blue-300" />Payment Terms</span>
                  <span className="text-xl font-extrabold text-blue-100">{supplier.paymentTerms || 'N/A'}{supplier.paymentTerms ? ' days' : ''}</span>
                </div>
                <div className="flex flex-col items-start gap-2 bg-purple-900/60 rounded-xl p-4 shadow">
                  <span className="text-xs text-purple-200 font-semibold flex items-center gap-1"><Star className="w-4 h-4 text-purple-300" />Tax ID</span>
                  <span className="text-xl font-extrabold text-purple-100">{supplier.taxId || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-[#232323] rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-gray-100">
            <h3 className="text-xl font-bold text-blue-200 mb-4 flex items-center gap-2"><Package className="w-6 h-6 text-blue-300" />Recent Orders</h3>
            <div className="flex flex-col items-center gap-2">
              <Package className="w-14 h-14 text-blue-200 mb-2" />
              <p className="text-blue-200 font-medium">Order history will be displayed here</p>
              <p className="text-sm text-blue-400">Integration with purchase orders coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-[#232323] rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-gray-100">
            <h3 className="text-xl font-bold text-green-200 mb-4 flex items-center gap-2"><DollarSign className="w-6 h-6 text-green-300" />Payment History</h3>
            <div className="flex flex-col items-center gap-2">
              <DollarSign className="w-14 h-14 text-green-200 mb-2" />
              <p className="text-green-200 font-medium">Payment history will be displayed here</p>
              <p className="text-sm text-green-400">Integration with payment tracking coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="bg-[#232323] rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-gray-100">
            <h3 className="text-xl font-bold text-purple-200 mb-4 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-purple-300" />Performance Analytics</h3>
            <div className="flex flex-col items-center gap-2">
              <TrendingUp className="w-14 h-14 text-purple-200 mb-2" />
              <p className="text-purple-200 font-medium">Performance analytics will be displayed here</p>
              <p className="text-sm text-purple-400">Detailed performance metrics coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierProfile;
