import React, { useState } from 'react';
import { returnsApi, SaleLookupOptions } from '@/lib/api/returns.api';
import { format } from 'date-fns';

interface SaleLookupProps {
  onSaleSelected: (sale: any) => void;
}

const SaleLookup: React.FC<SaleLookupProps> = ({ onSaleSelected }) => {
  const [searchOptions, setSearchOptions] = useState<SaleLookupOptions>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchOptions.invoiceNo &&
        !searchOptions.customerName &&
        !searchOptions.customerPhone) {
      alert('Please provide at least one search criteria');
      return;
    }

    setIsLoading(true);
    try {
      const response = await returnsApi.lookupSales(searchOptions);
      setSearchResults(response.data.sales);
      if (response.data.count === 0) {
        alert('No sales found matching your criteria');
      }
    } catch (error) {
      console.error('Sale lookup error:', error);
      alert('Failed to search for sales');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof SaleLookupOptions, value: string | number) => {
    setSearchOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaleSelect = (sale: any) => {
    setSelectedSaleId(sale._id);
    onSaleSelected(sale);
  };

  const getReturnStatus = (sale: any) => {
    if (!sale.returns || sale.returns.length === 0) {
      return { status: 'none', label: 'No Returns', color: 'default' };
    }
    
    const totalReturned = sale.returnSummary?.totalReturned || 0;
    const saleTotal = sale.total;
    
    if (totalReturned >= saleTotal) {
      return { status: 'full', label: 'Fully Returned', color: 'destructive' };
    } else if (totalReturned > 0) {
      return { status: 'partial', label: 'Partial Returns', color: 'warning' };
    }
    
    return { status: 'none', label: 'No Returns', color: 'default' };
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const getCustomerDisplayName = (customer: any) => {
    if (!customer) return 'Walk-in Customer';
    if (typeof customer === 'string') return customer;
    if (typeof customer === 'object') {
      if (typeof customer.name === 'object') {
        return customer.name.en || customer.name.si || customer._id || 'Customer';
      }
      if (customer.firstName || customer.lastName) {
        return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';
      }
      return customer.name || customer.email || customer.phone || customer._id || 'Customer';
    }
    return String(customer);
  };

  const getItemName = (item: any) => {
    if (!item) return 'Item';
    const product = item.product || item.productDetails || item;
    const nameSource = product.productName || product.name || item.productName || item.name;
    if (typeof nameSource === 'object') {
      return nameSource.en || nameSource.si || product.sku || product._id || 'Item';
    }
    return nameSource || product.sku || product._id || 'Item';
  };

  const getItemSummary = (items: any[] = []) => {
    if (!items.length) return 'No items recorded';
    const labels = items.map(getItemName);
    const previewCount = Math.min(labels.length, 2);
    const preview = labels.slice(0, previewCount).join(', ');
    const remaining = labels.length - previewCount;
    return remaining > 0 ? `${preview} +${remaining} more` : preview;
  };

  return (
    <div className="space-y-8">
      {/* Lookup Card */}
      <div className="relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br from-white/5 via-blue-500/5 to-purple-500/5" />
        <div className="relative">
          <h3 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">Sale Lookup</h3>
          <p className="text-sm text-gray-400 mb-6">Provide any criteria (at least one) to search for a sale.</p>
        </div>
        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400" htmlFor="invoiceNo">Invoice Number</label>
            <input id="invoiceNo" className="w-full px-3 py-2 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm" value={searchOptions.invoiceNo || ''} onChange={e=>handleInputChange('invoiceNo', e.target.value)} placeholder="INV001234" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400" htmlFor="customerName">Customer Name</label>
            <input id="customerName" className="w-full px-3 py-2 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm" value={searchOptions.customerName || ''} onChange={e=>handleInputChange('customerName', e.target.value)} placeholder="Name" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400" htmlFor="customerPhone">Customer Phone</label>
            <input id="customerPhone" className="w-full px-3 py-2 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm" value={searchOptions.customerPhone || ''} onChange={e=>handleInputChange('customerPhone', e.target.value)} placeholder="+94" />
          </div>
          {/* Removed customerEmail, productName, searchDays fields as per request */}
        </div>
        <div className="flex justify-end mt-8">
          <button onClick={handleSearch} disabled={isLoading} className="relative px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_-4px_rgba(59,130,246,0.6)] transition">
            <span>{isLoading ? 'Searching...' : 'Search Sales'}</span>
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="relative rounded-3xl p-6 bg-[#1E1E1E] border border-white/10 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
          <h4 className="text-lg font-semibold mb-4 text-white/90 tracking-wide">Search Results ({searchResults.length})</h4>
          <div className="space-y-4">
            {searchResults.map((sale) => {
              const returnStatus = getReturnStatus(sale);
              const isSelected = selectedSaleId === sale._id;
              return (
                <div
                  key={sale._id}
                  className={`group relative p-5 rounded-2xl border cursor-pointer transition overflow-hidden backdrop-blur-sm ${
                    isSelected
                      ? 'border-blue-500/60 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent'
                      : 'border-white/10 bg-white/5 hover:border-blue-400/40'
                  }`}
                  onClick={() => handleSaleSelect(sale)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-semibold tracking-wide text-white/90">{sale.invoiceNo}</div>
                    <div className="text-xs">
                      <span className={`px-2 py-1 rounded-full font-medium tracking-wide ${
                        returnStatus.status==='full'
                          ? 'bg-red-500/20 text-red-300'
                          : returnStatus.status==='partial'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-gray-500/20 text-gray-300'
                      }`}>{returnStatus.label}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                    <div>
                      <span className="text-gray-500">Date:</span> {format(new Date(sale.createdAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                    <div>
                      <span className="text-gray-500">Customer:</span> {getCustomerDisplayName(sale.customer)}
                    </div>
                    <div>
                      <span className="text-gray-500">Items:</span> {sale.items?.length || 0}
                      {sale.items?.length ? (
                        <p className="mt-1 text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                          {getItemSummary(sale.items)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {sale.returnSummary?.totalReturned > 0 && (
                    <div className="mt-3 text-sm space-y-1">
                      <div className="flex justify-between text-gray-400"><span>Previously Returned:</span><span className="text-red-400">-{formatCurrency(sale.returnSummary.totalReturned)}</span></div>
                      <div className="flex justify-between text-gray-300"><span>Remaining Amount:</span><span className="font-semibold text-white">{formatCurrency(sale.total - sale.returnSummary.totalReturned)}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {searchResults.length === 0 && !isLoading && (
        <div className="p-10 text-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-gray-400">
          <p>No results yet. Enter criteria and search.</p>
        </div>
      )}
    </div>
  );
};

export default SaleLookup;