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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{supplier.name}</h2>
              <p className="text-gray-600">Code: {supplier.supplierCode}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(supplier.status)}`}>
              {supplier.status}
            </span>
            {onEdit && (
              <button
                onClick={() => onEdit(supplier)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Orders</p>
                <p className="text-2xl font-bold text-blue-900">{supplier.totalOrders || 0}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Spent</p>
                <p className="text-2xl font-bold text-green-900">{formatLKR(supplier.totalSpent || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Outstanding</p>
                <p className="text-2xl font-bold text-yellow-900">{formatLKR(supplier.outstandingBalance || 0)}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Products</p>
                <p className="text-2xl font-bold text-purple-900">{supplier.productCount || 0}</p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'orders', label: 'Recent Orders', icon: Package },
            { id: 'payments', label: 'Payments', icon: DollarSign },
            { id: 'performance', label: 'Performance', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
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
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{supplier.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{supplier.email || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{'N/A'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{address.city || 'N/A'}, {address.province || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">On-Time Delivery</span>
                    <div className={`flex items-center space-x-1 ${getPerformanceColor(performance.onTimeDelivery || 0)}`}>
                      {getPerformanceIcon(performance.onTimeDelivery || 0)}
                      <span className="text-sm font-medium">{performance.onTimeDelivery != null ? performance.onTimeDelivery : 0}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${performance.onTimeDelivery || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Quality Rating</span>
                    <div className={`flex items-center space-x-1 ${getPerformanceColor(performance.qualityRating || 0)}`}>
                      {getPerformanceIcon(performance.qualityRating || 0)}
                      <span className="text-sm font-medium">{performance.qualityRating != null ? performance.qualityRating : 0}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${performance.qualityRating || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Credit Limit</p>
                  <p className="text-lg font-semibold text-gray-900">{formatLKR(supplier.creditLimit || 0)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Payment Terms</p>
                  <p className="text-lg font-semibold text-gray-900">{supplier.paymentTerms || 'N/A'} days</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Tax ID</p>
                  <p className="text-lg font-semibold text-gray-900">{supplier.taxId || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Order history will be displayed here</p>
              <p className="text-sm text-gray-500">Integration with purchase orders coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Payment history will be displayed here</p>
              <p className="text-sm text-gray-500">Integration with payment tracking coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Analytics</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Performance analytics will be displayed here</p>
              <p className="text-sm text-gray-500">Detailed performance metrics coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierProfile;
