// This file shows the main dashboard page.
// In simple English:
// - Shows business overview, charts, and statistics for sales, products, and customers.
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
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { usePosProcessStore } from '@/store/posProcess.store';

const Dashboard = () => {
  // State for dashboard statistics (sales, orders, products, customers)
  const [stats, setStats] = useState<StatsType>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    monthlyGrowth: 0,
    averageOrderValue: 0
  });

  // Load dashboard statistics and merge with real-time POS data for non-store-owner roles
  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const s = await dashboardApi.getStats();
        if (!mounted) return;
        const user = useAuthStore.getState().user;
        const role = user?.role;
        if (role !== 'store_owner') {
          const { currentSales, currentOrderCount } = usePosProcessStore.getState();
          setStats({
            ...s,
            totalSales: s.totalSales + currentSales,
            totalOrders: s.totalOrders + currentOrderCount,
            averageOrderValue: (s.totalOrders + currentOrderCount) > 0
              ? (s.totalSales + currentSales) / (s.totalOrders + currentOrderCount)
              : s.averageOrderValue
          });
        } else {
          setStats(s);
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn('Dashboard stats load failed', e);
      }
    };
    fetchStats();
    // Subscribe to real-time POS updates for non-store-owner roles
    const unsubscribe = usePosProcessStore.subscribe(
      (state) => [state.currentSales, state.currentOrderCount],
      () => {
        const user = useAuthStore.getState().user;
        const role = user?.role;
        if (role !== 'store_owner') fetchStats();
      }
    );
    return () => { mounted = false; unsubscribe(); };
  }, []);

  // State for various chart data
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProductsData, setTopProductsData] = useState<TopProduct[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

  // Load all chart data in parallel for better performance
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
      } catch (e) {
        if (import.meta.env.DEV) console.warn('Dashboard charts load failed', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Get translation function for multi-language support
  const { t } = useTranslation();

  return (
    <AppLayout className="bg-[#242424]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-10 p-6"
      >
        {/* Page header with title and subtitle */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#f8f8f8] tracking-tight">{t('dashboard.title')}</h1>
          <p className="mt-2 text-sm text-gray-400 tracking-wide">{t('dashboard.subtitle')}</p>
        </div>

        {/* Quick action buttons for common tasks */}
        <GlassCard variant="dark" className="p-6">
          <QuickActions />
        </GlassCard>

        {/* Statistics cards showing key business metrics */}
        <DashboardStats stats={stats} />

        {/* First row of charts: Sales trend and top products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesChart data={salesData} />
          <TopProducts data={topProductsData} />
        </div>

        {/* Second row of charts: Category distribution and recent sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryDistribution data={categoryData} />
          <RecentSales sales={recentSales} />
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Dashboard;


