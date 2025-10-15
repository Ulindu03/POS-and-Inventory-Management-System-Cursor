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
  const outstandingTotal = 0; // removed by request

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

        {/* Removed spending aggregate card by request */}

        {/* Removed outstanding card by request */}
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

      {/* Top Suppliers (removed by request) */}

      {/* Outstanding Payments summary removed by request */}
    </div>
  );
};

export default SupplierStats;
