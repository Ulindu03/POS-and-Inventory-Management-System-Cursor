import React, { useState, useEffect } from 'react';
import { returnsApi, ExchangeSlip } from '@/lib/api/returns.api';

interface ExchangeSlipManagerProps {
  customerId?: string;
}

const ExchangeSlipManager: React.FC<ExchangeSlipManagerProps> = ({ customerId }) => {
  const [exchangeSlips, setExchangeSlips] = useState<ExchangeSlip[]>([]);
  const [loading, setLoading] = useState(false);
  const [slipDetails, setSlipDetails] = useState<ExchangeSlip | null>(null);
  const [slipLookupValue, setSlipLookupValue] = useState('');
  const [phoneLookupValue, setPhoneLookupValue] = useState('');
  const [slipLookupLoading, setSlipLookupLoading] = useState(false);
  const [phoneLookupLoading, setPhoneLookupLoading] = useState(false);
  const [processingSlipId, setProcessingSlipId] = useState<string | null>(null);

  const getSlipKey = (slip?: ExchangeSlip | null) => {
    if (!slip) return '';
    return (slip._id || slip.slipNo || '').toString();
  };

  const isSameSlip = (left?: ExchangeSlip | null, right?: ExchangeSlip | null) => {
    if (!left || !right) return false;
    return getSlipKey(left) === getSlipKey(right);
  };

  useEffect(() => {
    if (customerId) {
      fetchExchangeSlips(customerId);
    } else {
      setExchangeSlips([]);
    }
  }, [customerId]);

  const fetchExchangeSlips = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await returnsApi.exchangeSlip.search({ customerId: id });
      setExchangeSlips(response.data.exchangeSlips);
    } catch (error: any) {
      console.error('Failed to fetch exchange slips:', error);
      setExchangeSlips([]);
      alert(error?.response?.data?.message || 'Failed to load exchange slips');
    } finally {
      setLoading(false);
    }
  };

  const syncSlipState = (updatedSlip: ExchangeSlip) => {
    setExchangeSlips((prev) => {
      if (!prev.length) return prev;
      const next = prev.map((slip) => (isSameSlip(slip, updatedSlip) ? { ...slip, ...updatedSlip } : slip));
      if (updatedSlip.status === 'cancelled') {
        return next.filter((slip) => !isSameSlip(slip, updatedSlip));
      }
      return next;
    });
    setSlipDetails((prev) => {
      if (!isSameSlip(prev, updatedSlip)) return prev;
      if (updatedSlip.status === 'cancelled') return null;
      return { ...prev!, ...updatedSlip };
    });
  };

  const handleSlipLookup = async () => {
    if (!slipLookupValue.trim()) {
      alert('Please enter an exchange slip number');
      return;
    }
    setSlipLookupLoading(true);
    try {
      const response = await returnsApi.exchangeSlip.getDetails(slipLookupValue.trim());
      setSlipDetails(response.data.exchangeSlip);
      setExchangeSlips([]);
    } catch (error) {
      console.error('Failed to lookup exchange slip:', error);
      alert('Exchange slip not found or invalid');
    } finally {
      setSlipLookupLoading(false);
    }
  };

  const handlePhoneLookup = async () => {
    if (!phoneLookupValue.trim()) {
      alert('Please enter a customer phone number');
      return;
    }
    setPhoneLookupLoading(true);
    try {
      const response = await returnsApi.exchangeSlip.search({ phone: phoneLookupValue.trim() });
      setExchangeSlips(response.data.exchangeSlips);
      setSlipDetails(null);
      if (!response.data.exchangeSlips.length) {
        alert('No exchange slips found for that phone number');
      }
    } catch (error: any) {
      console.error('Failed to lookup exchange slip by phone:', error);
      setExchangeSlips([]);
      const message = error?.response?.data?.message || 'Failed to lookup exchange slips by phone number';
      alert(message);
    } finally {
      setPhoneLookupLoading(false);
    }
  };

  const cancelSlip = async (slip: ExchangeSlip) => {
    const slipKey = getSlipKey(slip);
    if (!slipKey) {
      alert('Unable to identify this exchange slip');
      return;
    }

    const confirmCancel = window.confirm('Cancel this exchange slip?');
    if (!confirmCancel) return;
    const reason = window.prompt('Optional: note a cancellation reason')?.trim();

    setProcessingSlipId(slipKey);
    try {
      const response = await returnsApi.exchangeSlip.cancel(slipKey, reason || undefined);
      const updatedSlip = response.data.exchangeSlip;
      syncSlipState(updatedSlip);
      alert('Exchange slip cancelled successfully');
    } catch (error: any) {
      console.error('Failed to cancel exchange slip:', error);
      const message = error?.response?.data?.message || 'Failed to cancel exchange slip';
      alert(message);
    } finally {
      setProcessingSlipId(null);
    }
  };

  const redeemSlip = async (saleId: string) => {
    if (!slipDetails) return;

    try {
      await returnsApi.exchangeSlip.redeem(slipDetails.slipNo, saleId);
      
      alert('Exchange slip redeemed successfully');
      setSlipDetails(null);
    } catch (error) {
      console.error('Failed to redeem exchange slip:', error);
      alert('Failed to redeem exchange slip');
    }
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-300';
      case 'expired': return 'bg-red-500/20 text-red-300';
      case 'redeemed': return 'bg-gray-500/20 text-gray-300';
      case 'cancelled': return 'bg-red-500/30 text-red-200';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br from-white/5 via-blue-500/5 to-purple-500/5" />
        <p className="relative text-sm text-gray-300">Loading exchange slips...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Exchange Slip Lookup */}
      <div className="relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br from-white/5 via-indigo-500/5 to-transparent" />
        <div className="relative">
          <h3 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-6">Exchange Slip Lookup</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Slip Number</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={slipLookupValue}
                  onChange={(e) => setSlipLookupValue(e.target.value)}
                  placeholder="Enter exchange slip number"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm text-gray-200 placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSlipLookup();
                    }
                  }}
                />
                <button
                  onClick={handleSlipLookup}
                  disabled={slipLookupLoading}
                  className="relative px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_-4px_rgba(59,130,246,0.6)] transition"
                >
                  {slipLookupLoading ? 'Searching...' : 'Lookup'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Customer Phone</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={phoneLookupValue}
                  onChange={(e) => setPhoneLookupValue(e.target.value)}
                  placeholder="Enter phone to find slips"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm text-gray-200 placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePhoneLookup();
                    }
                  }}
                />
                <button
                  onClick={handlePhoneLookup}
                  disabled={phoneLookupLoading}
                  className="relative px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_-4px_rgba(59,130,246,0.6)] transition"
                >
                  {phoneLookupLoading ? 'Searching...' : 'Lookup' }
                </button>
              </div>
            </div>
          </div>
          {slipDetails && (
            <div className="p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <h4 className="font-semibold text-white/90 tracking-wide">Exchange Slip Found: <span className="text-green-300">#{slipDetails.slipNo}</span></h4>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(slipDetails.status)}`}>
                    {slipDetails.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-4 text-sm text-gray-300">
                <div>
                  <span className="text-gray-500 block mb-0.5">Value</span>
                  <p className="font-semibold text-white">{formatCurrency(slipDetails.totalValue)}</p>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Expires</span>
                  <p className="font-medium text-white/90">{formatDate(slipDetails.expiryDate)}</p>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Created</span>
                  <p className="font-medium text-white/90">{formatDate(slipDetails.createdAt)}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-4">
                <button
                  onClick={() => redeemSlip('current-sale')}
                  disabled={slipDetails.status !== 'active'}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_18px_-4px_rgba(16,185,129,0.5)]"
                >
                  Apply to Current Sale
                </button>
                <button
                  onClick={() => setSlipDetails(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm border border-white/10 text-gray-300 hover:bg-white/10 transition"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Available Exchange Slips List (if we had the API endpoint) */}
      {exchangeSlips.length > 0 && (
        <div className="relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-tr from-white/5 via-blue-500/5 to-transparent" />
          <div className="relative">
            <h3 className="text-xl font-semibold mb-6 text-white/90 tracking-wide">Available Exchange Slips</h3>
            <div className="space-y-5">
              {exchangeSlips.map((slip) => (
                <div
                  key={getSlipKey(slip)}
                  className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:border-blue-400/40 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-white/90 tracking-wide">Slip #{slip.slipNo}</h4>
                      <p className="text-xs text-gray-500 mt-1">Created: {formatDate(slip.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(slip.status)}`}>
                        {slip.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-6 text-sm text-gray-300">
                    <div>
                      <span className="text-gray-500 block mb-0.5">Value</span>
                      <p className="font-medium text-white">{formatCurrency(slip.totalValue)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Expires</span>
                      <p className="font-medium text-white/90">{formatDate(slip.expiryDate)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeSlipManager;