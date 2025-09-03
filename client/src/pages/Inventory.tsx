
import { AppLayout } from '@/components/common/Layout/Layout';
import { StockList } from "@/features/inventory/StockList";
import { StockAdjustment } from "@/features/inventory/StockAdjustment";
import { LowStockAlert } from "@/features/inventory/LowStockAlert";
import { StockMovementHistory } from "@/features/inventory/StockMovementHistory";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '@/lib/api/inventory.api';
import { useRealtime } from '@/hooks/useRealtime';

type InventoryTab = 'stock' | 'adjust' | 'alerts' | 'history';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock');
  const [lowCount, setLowCount] = useState<number | null>(null);

  const loadLowCount = useCallback(async () => {
    try {
      const res = await inventoryApi.lowStock();
      const items: any[] = ((res as any)?.data?.items) || [];
  // Count both low and critical as "low" for the badge
  const count = items.filter((i: any) => (i.stockStatus === 'low' || i.stockStatus === 'critical')).length;
  setLowCount(count);
    } catch {
      setLowCount(null);
    }
  }, []);

  useEffect(() => { loadLowCount(); }, [loadLowCount]);
  useRealtime((socket) => {
  socket.on('inventory.low_stock', () => loadLowCount());
  socket.on('inventory.updated', () => loadLowCount());
  });

  const tabs = useMemo(() => ([
    { id: 'stock' as const, label: 'Stock List', count: null },
    { id: 'adjust' as const, label: 'Adjust Stock', count: null },
    { id: 'alerts' as const, label: 'Low Stock', count: lowCount },
    { id: 'history' as const, label: 'Stock History', count: null },
  ]), [lowCount]);

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
          {activeTab === 'stock' && (
            <StockList
              onAdjust={(p) => {
                try {
                  const payload = {
                    _id: p._id,
                    sku: p.sku,
                    name: p.name,
                    currentStock: Number(p.stock?.current ?? 0),
                  };
                  sessionStorage.setItem('inventory.adjust.pending', JSON.stringify(payload));
                } catch {}
                setActiveTab('adjust');
              }}
            />
          )}
          {activeTab === 'adjust' && <StockAdjustment />}
          {activeTab === 'alerts' && <LowStockAlert />}
          {activeTab === 'history' && <StockMovementHistory />}
        </div>
      </div>
    </AppLayout>
  );
};

export default Inventory;