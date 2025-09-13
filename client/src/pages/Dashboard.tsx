import { AppLayout } from '@/components/common/Layout/Layout';
import { 
  DashboardStats, 
  SalesChart, 
  TopProducts, 
  CategoryDistribution, 
  RecentSales,
  QuickActions
} from '@/features/dashboard';
import { GlassCard } from '@/components/common/Card';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { dashboardApi, type DashboardStats as StatsType, type SalesData, type TopProduct, type CategoryData, type RecentSale } from '@/lib/api/dashboard.api';

const Dashboard = () => {
  const [stats, setStats] = useState<StatsType>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    monthlyGrowth: 0,
    averageOrderValue: 0
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await dashboardApi.getStats();
        if (mounted) setStats(s);
      } catch (_e) {
        // leave defaults on error; optionally log in dev
      }
    })();
    return () => { mounted = false; };
  }, []);

  const [salesData, setSalesData] = useState<SalesData[]>([]);

  const [topProductsData, setTopProductsData] = useState<TopProduct[]>([]);

  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [salesChart, topProducts, catDist, recents] = await Promise.all([
          dashboardApi.getSalesChart('weekly'),
          dashboardApi.getTopProducts(5),
          dashboardApi.getCategoryDistribution(),
          dashboardApi.getRecentSales(5)
        ]);
        if (!mounted) return;
        setSalesData(salesChart);
        setTopProductsData(topProducts);
        setCategoryData(catDist);
        setRecentSales(Array.isArray(recents) ? recents.slice(0, 5) : []);
      } catch (_e) {
        // ignore and keep defaults; optionally log in dev
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <AppLayout className="bg-[#242424]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-10 p-6"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#f8f8f8] tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-400 tracking-wide">Your business at a glance</p>
        </div>

        {/* Quick Actions */}
        <GlassCard variant="dark" className="p-6">
          <QuickActions />
        </GlassCard>

  {/* Stats Cards (supplier-style) */}
  <DashboardStats stats={stats} />

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesChart data={salesData} />
          <TopProducts data={topProductsData} />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryDistribution data={categoryData} />
          <RecentSales sales={recentSales} />
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Dashboard;


