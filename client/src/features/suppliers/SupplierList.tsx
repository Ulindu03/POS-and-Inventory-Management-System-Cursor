import React, { useState } from 'react';
import { Search, Plus, Eye, Edit, Trash2, Star, TrendingUp, DollarSign } from 'lucide-react';
import { Supplier } from '@/lib/api/suppliers.api';
import { formatLKR } from '@/lib/utils/currency';
import { GlassCard } from '@/components/common/Card';

interface SupplierListProps {
  suppliers: Supplier[];
  onViewSupplier: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onAddSupplier: () => void;
  loading?: boolean;
}

export const SupplierList: React.FC<SupplierListProps> = ({
  suppliers,
  onViewSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onAddSupplier,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplierCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || supplier.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Supplier];
    let bValue: any = b[sortBy as keyof Supplier];
    
    if (sortBy === 'totalSpent' || sortBy === 'outstandingBalance') {
      aValue = aValue || 0;
      bValue = bValue || 0;
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30';
      case 'inactive': return 'bg-[#393939] text-gray-300 ring-1 ring-[#454545]';
      case 'suspended': return 'bg-red-500/15 text-red-300 ring-1 ring-red-400/30';
      default: return 'bg-[#393939] text-gray-300 ring-1 ring-[#454545]';
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <GlassCard variant="dark" className="p-0 overflow-hidden border border-[#454545]">
      {/* Header */}
      <div className="px-6 py-6 border-b border-white/10 bg-gradient-to-br from-purple-600/10 via-indigo-500/5 to-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-100 tracking-wide">Suppliers</h2>
            <p className="text-sm text-gray-400 mt-1">
              Manage your suppliers and track performance
            </p>
          </div>
          <button
            onClick={onAddSupplier}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white transition-all shadow focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-5 border-b border-white/10 bg-[#2f2f2f]/60 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#242424]/80 border border-[#454545] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/40 transition"
              />
            </div>
          </div>
          
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#242424]/80 border border-[#454545] text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#242424]/80 border border-[#454545] text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            >
              <option value="name">Sort by Name</option>
              <option value="supplierCode">Sort by Code</option>
              <option value="rating">Sort by Rating</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 rounded-xl bg-[#242424]/80 border border-[#454545] text-gray-200 hover:bg-[#393939]/70 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
        </div>
      </div>

      {/* Supplier List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#2f2f2f]/60 backdrop-blur-sm">
            <tr className="border-b border-white/10">
              <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-400/80 uppercase tracking-wide">Supplier</th>
              <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-400/80 uppercase tracking-wide">Contact</th>
              <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-400/80 uppercase tracking-wide">Performance</th>
              <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-400/80 uppercase tracking-wide">Status</th>
              <th className="px-6 py-3 text-right text-[11px] font-medium text-gray-400/80 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-[#242424]/40">
            {sortedSuppliers.map((supplier) => (
              <tr key={supplier._id} className="group transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="relative">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl bg-gradient-to-r from-white/10 via-white/0 to-transparent" />
                    <div className="relative">
                      <div className="text-sm font-medium text-gray-100">{supplier.name}</div>
                      <div className="text-sm text-gray-400">{supplier.supplierCode}</div>
                      <div className="flex items-center mt-1">
                        {getRatingStars(supplier.rating)}
                        <span className="text-xs text-gray-500 ml-1">({supplier.rating}/5)</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-100">{supplier.contactPerson}</div>
                  <div className="text-sm text-gray-400">{supplier.email}</div>
                  <div className="text-sm text-gray-400">{supplier.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm">
                      <TrendingUp className="w-4 h-4 text-emerald-400 mr-1" />
                      <span className="text-gray-100">{supplier.performance.onTimeDelivery}%</span>
                      <span className="text-gray-500 text-xs ml-1">On-time</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-gray-100">{supplier.performance.qualityRating}%</span>
                      <span className="text-gray-500 text-xs ml-1">Quality</span>
                    </div>
                  </div>
                </td>
                {/* Financial column removed by request */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-[10px] font-semibold rounded-full ${getStatusColor(supplier.status)}`}>{supplier.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewSupplier(supplier)}
                      className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-400/10"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditSupplier(supplier)}
                      className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-emerald-400/10"
                      title="Edit Supplier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteSupplier(supplier._id)}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedSuppliers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400">
            {searchTerm || statusFilter ? 'No suppliers found matching your criteria.' : 'No suppliers found.'}
          </div>
          {!searchTerm && !statusFilter && (
            <button
              onClick={onAddSupplier}
              className="mt-4 text-blue-400 hover:text-blue-300 font-medium"
            >
              Add your first supplier
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
};
