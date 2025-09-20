import React, { useState } from 'react';
import SaleLookup from '../components/returns/SaleLookup';
import ReturnProcessor from '../components/returns/ReturnProcessor';
import ExchangeSlipManager from '../components/returns/ExchangeSlipManager';
import CustomerOverpaymentManager from '../components/returns/CustomerOverpaymentManager';
import ReturnsList from '../components/returns/ReturnsList';
import { AppLayout } from '@/components/common/Layout/Layout';

type TabType = 'process' | 'exchange' | 'credit' | 'history';

const ReturnsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('process');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string>('');

  const tabs = [
    { id: 'process', label: 'Process Returns', icon: '↩️' },
    { id: 'exchange', label: 'Exchange Slips', icon: '🎫' },
    { id: 'credit', label: 'Customer Credit', icon: '💳' },
    { id: 'history', label: 'Return History', icon: '📋' },
  ];

  const handleSaleSelected = (sale: any) => {
    setSelectedSale(sale);
    if (sale.customer) {
      setCustomerId(sale.customer._id || sale.customer);
    }
  };

  const handleReturnCompleted = () => {
    setSelectedSale(null);
    alert('Return processed successfully');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'process':
        return (
          <div className="space-y-6">
            {!selectedSale ? (
              <SaleLookup onSaleSelected={handleSaleSelected} />
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-blue-900">
                        Processing Return for Sale: {selectedSale.invoiceNo}
                      </h3>
                      <p className="text-sm text-blue-700">
                        Date: {new Date(selectedSale.createdAt).toLocaleDateString()} | 
                        Customer: {selectedSale.customer?.name || 'Walk-in'} |
                        Total: LKR {selectedSale.totalAmount?.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedSale(null)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Change Sale
                    </button>
                  </div>
                </div>
                <ReturnProcessor 
                  sale={selectedSale} 
                  onComplete={handleReturnCompleted}
                />
              </div>
            )}
          </div>
        );

      case 'exchange':
        return (
          <div className="space-y-8">
            <div className="relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br from-white/5 via-blue-500/5 to-purple-500/5" />
              <div className="relative">
                <h2 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-4">Exchange Slip Management</h2>
                <p className="text-gray-400 mb-6 max-w-2xl">Manage and redeem exchange slips issued for returns.</p>
                <div className="mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Customer ID (Optional)</label>
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="Enter customer ID to filter slips"
                    className="w-full md:w-96 px-4 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm text-gray-200 placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
            <ExchangeSlipManager customerId={customerId || undefined} />
          </div>
        );

      case 'credit':
        return (
          <div className="space-y-8">
            <div className="relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br from-white/5 via-indigo-500/5 to-purple-500/5" />
              <div className="relative">
                <h2 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-4">Customer Credit Management</h2>
                <p className="text-gray-400 mb-6 max-w-2xl">View and apply customer credit balances from overpayments and returns.</p>
                <div className="mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Customer ID</label>
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="Enter customer ID to view credit balance"
                    className="w-full md:w-96 px-4 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm text-gray-200 placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
            {customerId && (
              <CustomerOverpaymentManager
                customerId={customerId}
                onApplyCredit={(amount) => alert(`Applied ${amount} LKR to current sale`)}
              />
            )}
            {!customerId && (
              <div className="p-10 text-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-gray-400">
                <p>Enter a customer ID to view credit balance</p>
              </div>
            )}
          </div>
        );

      case 'history':
        return (
          <div className="space-y-8">
            <div className="relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br from-white/5 via-blue-500/5 to-transparent" />
              <div className="relative">
                <h2 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-4">Return History</h2>
                <p className="text-gray-400 mb-6 max-w-2xl">View and manage return transaction history.</p>
                <div className="mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Filter by Customer (Optional)</label>
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="Enter customer ID to filter returns"
                    className="w-full md:w-96 px-4 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm text-gray-200 placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
            <ReturnsList customerId={customerId || undefined} />
          </div>
        );


      default:
        return null;
    }
  };

  return (
    <AppLayout className="bg-[#242424]">
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">
            Returns & Refunds
          </h1>
          <p className="text-gray-400 text-lg">Comprehensive return management system</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 justify-center">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`relative px-5 py-2.5 rounded-2xl text-sm font-semibold tracking-wide transition-all backdrop-blur-sm border group overflow-hidden ${
                  active
                    ? 'border-blue-400/40 text-white bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-purple-500/20 shadow-[0_4px_24px_-6px_rgba(59,130,246,0.4)]'
                    : 'border-white/10 text-gray-300 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span>{tab.icon}</span>
                  {tab.label}
                </span>
                {active && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-purple-500/20 opacity-60 group-hover:opacity-80 transition-opacity" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="min-h-[600px]">
          {renderTabContent()}
        </div>
      </div>
    </AppLayout>
  );
};

export default ReturnsPage;