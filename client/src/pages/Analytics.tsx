import { useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import reportsApi from '@/lib/api/reports.api';
import { AreaChart, BarChart, PieChart } from '@/components/common/Charts';
import { GlassCard, StatsCard } from '@/components/common/Card';
import { Calendar, RefreshCcw, Users, Package, TrendingUp, Truck, AlertTriangle, CheckCircle, Percent } from '@/lib/safe-lucide-react';
import { useRealtime } from '@/hooks/useRealtime';

const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState(() => ({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  }));
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [staffPerf, setStaffPerf] = useState<any>(null);
  const [deliveryPerf, setDeliveryPerf] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<{ delivery?: number; inventory?: number; sales?: number }>(() => ({}));
  // Keep the latest date range available inside socket callbacks
  const dateRangeRef = useRef(dateRange);
  useEffect(() => { dateRangeRef.current = dateRange; }, [dateRange]);

  // Normalize date params to include the full end day; server uses $lte end
  const buildRangeParams = (range: { startDate: string; endDate: string }) => {
    const start = `${range.startDate}T00:00:00.000`;
    const end = `${range.endDate}T23:59:59.999`;
    return { startDate: start, endDate: end } as any;
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
  const params = buildRangeParams(dateRange);
  const [s, inv, top, staff, del] = await Promise.all([
        reportsApi.sales({ ...params, period: 'daily' }),
        reportsApi.inventory(params),
        reportsApi.topProducts({ ...params, limit: 8, sort: 'best' }),
        reportsApi.staffPerformance(params),
        reportsApi.deliveryPerformance(params)
      ]);
  setSales(s?.data || null);
      setInventory(inv?.data || null);
  // topProducts endpoint returns { success, data: [...] }
  const topArr = Array.isArray(top) ? top : (top?.data || []);
  setTopProducts(Array.isArray(topArr) ? topArr : []);
  setStaffPerf(staff || null);
  setDeliveryPerf(del || null);
  const now = Date.now();
  setLastUpdated({ sales: now, inventory: now, delivery: now });
    } catch (e) {
      console.error('Failed to load analytics', e);
    } finally {
      setLoading(false);
    }
  };

  // Lightweight fetchers for real-time updates (avoid toggling the main loading state)
  const rtFetchDelivery = async () => {
    try {
      const params = buildRangeParams(dateRangeRef.current);
      const del = await reportsApi.deliveryPerformance(params);
      setDeliveryPerf(del || null);
      setLastUpdated((p) => ({ ...p, delivery: Date.now() }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('rt delivery refresh failed');
    }
  };
  const rtFetchInventory = async () => {
    try {
      const params = buildRangeParams(dateRangeRef.current);
      const inv = await reportsApi.inventory(params);
      setInventory(inv?.data || null);
      setLastUpdated((p) => ({ ...p, inventory: Date.now() }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('rt inventory refresh failed');
    }
  };
  const rtFetchSalesAndStaff = async () => {
    try {
      const params = { ...buildRangeParams(dateRangeRef.current), period: 'daily' } as any;
      const [s, top, staff] = await Promise.all([
        reportsApi.sales(params),
        reportsApi.topProducts({ ...params, limit: 8, sort: 'best' }),
        reportsApi.staffPerformance(buildRangeParams(dateRangeRef.current)),
      ]);
      setSales(s?.data || null);
      const topArr = Array.isArray(top) ? top : (top?.data || []);
      setTopProducts(Array.isArray(topArr) ? topArr : []);
      setStaffPerf(staff || null);
      setLastUpdated((p) => ({ ...p, sales: Date.now() }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('rt sales refresh failed');
    }
  };

  // Debounce bursts of events
  const deliveryTimerRef = useRef<number | null>(null);
  const inventoryTimerRef = useRef<number | null>(null);
  const scheduleDeliveryRefresh = () => {
    if (deliveryTimerRef.current) window.clearTimeout(deliveryTimerRef.current);
    deliveryTimerRef.current = window.setTimeout(rtFetchDelivery, 250);
  };
  const scheduleInventoryRefresh = () => {
    if (inventoryTimerRef.current) window.clearTimeout(inventoryTimerRef.current);
    inventoryTimerRef.current = window.setTimeout(rtFetchInventory, 300);
  };
  const salesTimerRef = useRef<number | null>(null);
  const scheduleSalesRefresh = () => {
    if (salesTimerRef.current) window.clearTimeout(salesTimerRef.current);
    salesTimerRef.current = window.setTimeout(rtFetchSalesAndStaff, 220);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when date range changes
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate, dateRange.endDate]);

  // Real-time: listen to delivery and inventory events and refresh relevant sections
  useRealtime((socket) => {
    socket.on('delivery:created', scheduleDeliveryRefresh);
    socket.on('delivery:updated', scheduleDeliveryRefresh);
    socket.on('delivery:status', scheduleDeliveryRefresh);
    // Inventory may affect low/out-of-stock stats
    socket.on('inventory.low_stock', scheduleInventoryRefresh);
    // Sales impact revenue trend, top products, staff performance
    socket.on('sales:created', scheduleSalesRefresh);
  });

  const salesTrend = useMemo(() => {
    return (sales?.periodData || []).map((p: any) => ({ name: p.period, revenue: p.revenue, sales: p.sales }));
  }, [sales]);

  const topProductsData = useMemo(() => {
  const arr: any[] = Array.isArray(topProducts) ? topProducts : [];
    return arr.map((p: any) => {
      const base = p.productName || 'Unknown';
      const suffix = p.sku ? ` (${p.sku})` : '';
      return { name: (base + suffix).trim(), revenue: p.totalRevenue || 0 };
    });
  }, [topProducts]);

  const categoryPie = useMemo(() => {
    return (inventory?.categoryBreakdown || []).map((c: any) => ({ name: c.categoryName || 'Uncategorized', value: c.totalValue }));
  }, [inventory]);

  const staffRevenueBars = useMemo(() => {
    return (staffPerf?.data?.performance || []).slice(0, 8).map((s: any) => ({ name: s.username, revenue: s.totalRevenue }));
  }, [staffPerf]);

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">Analytics</h1>
            <p className="text-gray-400">Key trends and performance insights</p>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F8F8F8]/60" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-[160px] pl-9 pr-3 py-2 rounded-lg bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                />
              </div>
              <span className="text-[#F8F8F8]/60">to</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F8F8F8]/60" />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-[160px] pl-9 pr-3 py-2 rounded-lg bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                />
              </div>
            </div>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-300 to-amber-300 text-black font-semibold disabled:opacity-60 hover:shadow-[0_6px_24px_-6px_rgba(234,179,8,0.6)]"
            >
              <RefreshCcw className="w-4 h-4" /> {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Revenue"
            value={Math.round(sales?.summary?.totalRevenue || 0).toLocaleString()}
            prefix="LKR "
            change={Math.round(sales?.summary?.profitMargin || 0)}
            trend={(sales?.summary?.profitMargin || 0) >= 0 ? 'up' : 'down'}
            icon={<TrendingUp className="w-6 h-6" />}
            cardVariant="darkSubtle"
          />
          <StatsCard
            title="Orders"
            value={(sales?.summary?.totalSales || 0).toLocaleString()}
            icon={<Users className="w-6 h-6" />}
            cardVariant="darkSubtle"
          />
          <StatsCard
            title="Products"
            value={(inventory?.summary?.totalProducts || 0).toLocaleString()}
            icon={<Package className="w-6 h-6" />}
            cardVariant="darkSubtle"
          />
          <StatsCard
            title="Low/Out of Stock"
            value={`${inventory?.summary?.lowStockCount || 0} / ${inventory?.summary?.outOfStockCount || 0}`}
            icon={<Package className="w-6 h-6" />}
            cardVariant="darkSubtle"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AreaChart
            data={salesTrend}
            title="Revenue Trend"
            dataKey="revenue"
            height={360}
          />
          <BarChart
            data={topProductsData}
            title="Top Products by Revenue"
            dataKey="revenue"
            height={360}
          />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChart data={categoryPie} title="Inventory Value by Category" height={360} />
          <BarChart data={staffRevenueBars} title="Staff Revenue" dataKey="revenue" height={360} />
        </div>

        {/* Delivery Summary */}
        {deliveryPerf?.data?.summary && (
          <GlassCard variant="darkSubtle" className="p-6 border border-[#3e3e3e]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#F8F8F8]">Delivery Performance</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="relative inline-flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" /> Live
                </span>
                <span>• Updated {lastUpdated.delivery ? new Date(lastUpdated.delivery).toLocaleTimeString() : '—'}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Deliveries */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-400/20 border border-amber-400/30 text-amber-300">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">Total Deliveries</p>
                    <p className="text-xl font-bold text-[#F8F8F8]">{(deliveryPerf.data.summary.total || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Completion Rate */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-400/15 border border-emerald-400/30 text-emerald-300">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">Completion Rate</p>
                    <p className="text-xl font-bold text-[#F8F8F8]">{(deliveryPerf.data.summary.completionRate || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Damaged Total */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-rose-400/15 border border-rose-400/30 text-rose-300">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">Damaged Total</p>
                    <p className="text-xl font-bold text-[#F8F8F8]">{(deliveryPerf.data.summary.totalDamaged || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Completed */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-sky-400/15 border border-sky-400/30 text-sky-300">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">Completed</p>
                    <p className="text-xl font-bold text-[#F8F8F8]">{(deliveryPerf.data.summary.statusCounts?.completed || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </AppLayout>
  );
};

export default Analytics;
