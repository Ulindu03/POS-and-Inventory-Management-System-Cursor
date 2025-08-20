
import { AppLayout } from '@/components/common/Layout/Layout';
import { StockList } from "@/features/inventory/StockList";
import { StockAdjustment } from "@/features/inventory/StockAdjustment";
import { LowStockAlert } from "@/features/inventory/LowStockAlert";
import { StockMovementHistory } from "@/features/inventory/StockMovementHistory";
import { useState } from 'react';

type InventoryTab = 'stock' | 'adjust' | 'alerts' | 'history';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock');

  const tabs = [
    { id: 'stock' as const, label: 'Stock List', count: null },
    { id: 'adjust' as const, label: 'Adjust Stock', count: null },
    { id: 'alerts' as const, label: 'Low Stock', count: 23 },
    { id: 'history' as const, label: 'Stock History', count: null },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#F8F8F8]">Inventory Management</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/20 text-[#F8F8F8] border border-white/20'
                  : 'bg-white/5 text-[#F8F8F8]/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[600px]">
          {activeTab === 'stock' && <StockList />}
          {activeTab === 'adjust' && <StockAdjustment />}
          {activeTab === 'alerts' && <LowStockAlert />}
          {activeTab === 'history' && <StockMovementHistory />}
        </div>
      </div>
    </AppLayout>
  );
};

export default Inventory;