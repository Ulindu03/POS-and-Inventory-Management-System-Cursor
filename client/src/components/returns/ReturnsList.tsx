import React, { useState, useEffect } from 'react';
import { returnsApi, ReturnTransaction } from '@/lib/api/returns.api';

interface ReturnsListProps {
  customerId?: string;
  customerCode?: string;
  limit?: number;
}

const ReturnsList: React.FC<ReturnsListProps> = ({ customerId, customerCode, limit = 20 }) => {
  const [returns, setReturns] = useState<ReturnTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    limit: limit
  });
  const [filters, setFilters] = useState({
    status: '',
    returnType: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchReturns();
  }, [customerId, pagination.page, filters]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        customerId,
        customerCode,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] === '') {
          delete params[key as keyof typeof params];
        }
      });

      const response = await returnsApi.list(params);
      setReturns(response.data.items);
      setPagination(prev => ({
        ...prev,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Failed to fetch returns:', error);
      alert('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300';
      case 'approved': return 'bg-blue-500/20 text-blue-300';
      case 'processed': return 'bg-green-500/20 text-green-300';
      case 'cancelled': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getReturnTypeColor = (type: string) => {
    switch (type) {
      case 'full_refund': return 'bg-red-500/20 text-red-300';
      case 'partial_refund': return 'bg-orange-500/20 text-orange-300';
      case 'exchange': return 'bg-blue-500/20 text-blue-300';
      case 'store_credit': return 'bg-green-500/20 text-green-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const getSaleLabel = (sale: any) => {
    if (!sale) return 'Unknown Sale';
    if (typeof sale === 'string') return sale;
    if (typeof sale === 'object') {
      return sale.invoiceNo || sale.saleNo || sale.reference || sale._id || 'Sale Record';
    }
    return String(sale);
  };

  const getProductLabel = (product: any) => {
    if (!product) return 'Unknown Product';
    if (typeof product === 'string') return product;
    if (typeof product === 'object') {
      if (typeof product.name === 'object') {
        return product.name.en || product.name.si || product.sku || product._id || 'Product';
      }
      return product.name || product.sku || product.productCode || product._id || 'Product';
    }
    return String(product);
  };

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br from-white/5 via-indigo-500/5 to-transparent" />
        <div className="relative">
          <h3 className="text-xl font-semibold mb-6 text-white/90 tracking-wide">Filter Returns</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm text-gray-200"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="processed">Processed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Return Type</label>
              <select
                value={filters.returnType}
                onChange={(e) => handleFilterChange('returnType', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm text-gray-200"
              >
                <option value="">All Types</option>
                <option value="full_refund">Full Refund</option>
                <option value="partial_refund">Partial Refund</option>
                <option value="exchange">Exchange</option>
                <option value="store_credit">Store Credit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm text-gray-200"
              />
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => {
                setFilters({ status: '', returnType: '', dateFrom: '', dateTo: '' });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-5 py-2.5 rounded-xl font-medium text-sm border border-white/10 text-gray-300 hover:bg-white/10 transition"
            >
              Clear Filters
            </button>
            <button
              onClick={fetchReturns}
              className="relative px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.6)]"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Returns List */}
      <div className="relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-tr from-white/5 via-purple-500/5 to-transparent" />
        <div className="relative">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <h3 className="text-xl font-semibold text-white/90 tracking-wide">Returns History {customerId ? '(Customer)' : '(All)'}</h3>
            <p className="text-sm text-gray-400">Showing {returns.length} of {pagination.total} returns</p>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <p>Loading returns...</p>
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No returns found</p>
            </div>
          ) : (
            <div className="space-y-5">
              {returns.map((returnTx) => (
                <div key={returnTx._id} className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:border-blue-400/40 transition">
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <div>
                      <h4 className="font-semibold text-white/90 tracking-wide">Return #{returnTx.returnNo}</h4>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(returnTx.createdAt)}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(returnTx.status)}`}>{returnTx.status.toUpperCase()}</span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getReturnTypeColor(returnTx.returnType)}`}>{returnTx.returnType.replace('_', ' ').toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm mb-4 text-gray-300">
                    <div>
                      <span className="text-gray-500 block mb-0.5">Original Sale</span>
                      <p className="font-medium text-white/90">{getSaleLabel(returnTx.originalSale)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Amount</span>
                      <p className="font-semibold text-white">{formatCurrency(returnTx.totalAmount)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Items</span>
                      <p className="font-medium text-white/90">{returnTx.items.length}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Refund Method</span>
                      <p className="font-medium text-white/90">{returnTx.refundMethod.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <h5 className="text-sm font-medium mb-3 text-white/80">Returned Items</h5>
                    <div className="space-y-2">
                      {returnTx.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm bg-white/5 p-2.5 rounded-lg border border-white/10">
                          <div className="text-gray-300">
                            <span className="font-medium text-white/90">Product: {getProductLabel(item.product)}</span>
                            <span className="text-gray-500 ml-2">Qty: {item.quantity} | Reason: {item.reason}</span>
                          </div>
                          <span className="font-medium text-white">{formatCurrency(item.returnAmount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {(returnTx.exchangeSlip || returnTx.overpaymentCreated) && (
                    <div className="border-t border-white/10 pt-4 mt-4 text-sm space-y-1">
                      {returnTx.exchangeSlip && (
                        <div className="text-green-300 font-medium">Exchange Slip Created: {returnTx.exchangeSlip}</div>
                      )}
                      {returnTx.overpaymentCreated && (
                        <div className="text-blue-300 font-medium">Customer Credit Created: {returnTx.overpaymentCreated}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-3 flex-wrap">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-5 py-2 rounded-xl border border-blue-400/40 bg-blue-500/10 text-sm font-medium text-blue-200">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= totalPages}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReturnsList;