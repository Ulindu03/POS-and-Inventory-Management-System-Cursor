import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import reportsApi from '@/lib/api/reports.api';
import { AreaChart, BarChart, PieChart } from '@/components/common/Charts';
import { GlassCard, StatsCard } from '@/components/common/Card';
import { Calendar, RefreshCcw, Users, Package, TrendingUp } from '@/lib/safe-lucide-react';

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

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = { startDate: dateRange.startDate, endDate: dateRange.endDate } as any;
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
    } catch (e) {
      console.error('Failed to load analytics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F8F8F8]">Analytics</h1>
            <p className="text-[#F8F8F8]/70">Key trends and performance insights</p>
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-300 text-black font-semibold disabled:opacity-60"
            >
              <RefreshCcw className="w-4 h-4" /> {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Revenue"
            value={Math.round(sales?.summary?.totalRevenue || 0).toLocaleString()}
            prefix="LKR "
            change={Math.round(sales?.summary?.profitMargin || 0)}
            trend={(sales?.summary?.profitMargin || 0) >= 0 ? 'up' : 'down'}
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <StatsCard
            title="Orders"
            value={(sales?.summary?.totalSales || 0).toLocaleString()}
            icon={<Users className="w-6 h-6" />}
          />
          <StatsCard
            title="Products"
            value={(inventory?.summary?.totalProducts || 0).toLocaleString()}
            icon={<Package className="w-6 h-6" />}
          />
          <StatsCard
            title="Low/Out of Stock"
            value={`${inventory?.summary?.lowStockCount || 0} / ${inventory?.summary?.outOfStockCount || 0}`}
            icon={<Package className="w-6 h-6" />}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AreaChart
            data={salesTrend}
            title="Revenue Trend"
            dataKey="revenue"
            height={340}
          />
          <BarChart
            data={topProductsData}
            title="Top Products by Revenue"
            dataKey="revenue"
            height={340}
          />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChart data={categoryPie} title="Inventory Value by Category" height={340} />
          <BarChart data={staffRevenueBars} title="Staff Revenue" dataKey="revenue" height={340} />
        </div>

        {/* Delivery Summary */}
        {deliveryPerf?.data?.summary && (
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Delivery Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Deliveries</p>
                <p className="text-2xl font-bold">{(deliveryPerf.data.summary.total || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">{(deliveryPerf.data.summary.completionRate || 0).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Damaged Total</p>
                <p className="text-2xl font-bold">{(deliveryPerf.data.summary.totalDamaged || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{(deliveryPerf.data.summary.statusCounts?.completed || 0).toLocaleString()}</p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </AppLayout>
  );
};

export default Analytics;
