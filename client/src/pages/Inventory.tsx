
import { AppLayout } from '@/components/common/Layout/Layout';
import { StockList } from "@/features/inventory/StockList";
import { StockAdjustment } from "@/features/inventory/StockAdjustment";
import { LowStockAlert } from "@/features/inventory/LowStockAlert";
import { StockMovementHistory } from "@/features/inventory/StockMovementHistory";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '@/lib/api/inventory.api';
import { useTranslation } from 'react-i18next';
import { useRealtime } from '@/hooks/useRealtime';

type InventoryTab = 'stock' | 'adjust' | 'alerts' | 'history';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock');
  const { t } = useTranslation();
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
    { id: 'stock' as const, label: t('inventoryPage.tabs.stockList'), count: null },
    { id: 'adjust' as const, label: t('inventoryPage.tabs.adjustStock'), count: null },
    { id: 'alerts' as const, label: t('inventoryPage.tabs.lowStock'), count: lowCount },
    { id: 'history' as const, label: t('inventoryPage.tabs.stockHistory'), count: null },
  ]), [lowCount, t]);

  return (
    <AppLayout className="bg-[#242424]">
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">
            {t('inventoryPage.title')}
          </h1>
          <p className="text-gray-400 text-lg">{t('inventoryPage.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 justify-center">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-2.5 rounded-2xl text-sm font-semibold tracking-wide transition-all backdrop-blur-sm border group overflow-hidden ${
                  active
                    ? 'border-blue-400/40 text-white bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-purple-500/20 shadow-[0_4px_24px_-6px_rgba(59,130,246,0.4)]'
                    : 'border-white/10 text-gray-300 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {tab.label}
                  {tab.count !== null && (
                    <span className={`ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold tracking-wide ${
                      active ? 'bg-red-500/90 text-white' : 'bg-red-500/80 text-white'
                    }`}>
                      {tab.count}
                    </span>
                  )}
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