import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Building
} from 'lucide-react';
import { SupplierStats as ApiStats } from '@/lib/api/suppliers.api';
import { formatLKR } from '@/lib/utils/currency';

interface SupplierStatsProps {
  stats: ApiStats;
}

const SupplierStats: React.FC<SupplierStatsProps> = ({ stats }) => {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <AlertTriangle className="w-4 h-4" />;
      case 'suspended': return <Clock className="w-4 h-4" />;
      default: return <Building className="w-4 h-4" />;
    }
  };

  // Normalize API stats to UI-friendly fields
  const total = stats.totalSuppliers;
  const active = stats.activeSuppliers;
  const inactive = stats.inactiveSuppliers;
  const suspended = 0;
  const outstandingTotal = (stats.outstandingPayments || []).reduce((sum, p) => sum + p.outstandingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
              <p className="text-3xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+12%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
              <p className="text-3xl font-bold text-gray-900">{active}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">
              {total > 0 ? ((active / total) * 100).toFixed(1) : '0.0'}% of total
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Suppliers Spent</p>
              <p className="text-3xl font-bold text-gray-900">{formatLKR((stats.topSuppliers || []).reduce((s, t) => s + t.totalSpent, 0))}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+8.2%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-3xl font-bold text-gray-900">{formatLKR(outstandingTotal)}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            <span className="text-red-600 font-medium">-3.1%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Status Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { status: 'Active', count: active, color: 'green' },
            { status: 'Inactive', count: inactive, color: 'red' },
            { status: 'Suspended', count: suspended, color: 'yellow' }
          ].map((item) => (
            <div key={item.status} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 bg-${item.color}-100 rounded-lg`}>
                  {getStatusIcon(item.status)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.status}</p>
                  <p className="text-sm text-gray-600">{item.count} suppliers</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{item.count}</p>
                <p className="text-sm text-gray-600">
                  {total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Suppliers */}
  {stats.topSuppliers && stats.topSuppliers.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Suppliers by Total Spent</h3>
          <div className="space-y-3">
            {stats.topSuppliers.slice(0, 5).map((supplier, index) => (
              <div key={supplier.supplierCode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{supplier.name}</p>
                    <p className="text-sm text-gray-600">{supplier.supplierCode}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatLKR(supplier.totalSpent)}</p>
                  <p className="text-sm text-gray-600">{supplier.orderCount} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outstanding Payments */}
  {outstandingTotal > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Outstanding Payments Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Total Outstanding</p>
                  <p className="text-2xl font-bold text-yellow-900">{formatLKR(outstandingTotal)}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierStats;
