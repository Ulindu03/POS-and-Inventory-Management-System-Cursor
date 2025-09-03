import { AppLayout } from '@/components/common/Layout/Layout';
import { 
  DashboardStats, 
  SalesChart, 
  TopProducts, 
  CategoryDistribution, 
  RecentSales,
  QuickActions
} from '@/features/dashboard';
import { motion } from 'framer-motion';

const Dashboard = () => {
  // Sample data - in real app, this would come from API
  const stats = {
    totalSales: 1250000,
    totalOrders: 342,
    totalProducts: 156,
    totalCustomers: 89,
    monthlyGrowth: 15,
    averageOrderValue: 3655
  };

  const salesData = [
    { name: 'Mon', sales: 45000, orders: 12 },
    { name: 'Tue', sales: 52000, orders: 15 },
    { name: 'Wed', sales: 48000, orders: 13 },
    { name: 'Thu', sales: 61000, orders: 18 },
    { name: 'Fri', sales: 55000, orders: 16 },
    { name: 'Sat', sales: 72000, orders: 22 },
    { name: 'Sun', sales: 68000, orders: 20 }
  ];

  const topProductsData = [
    { name: 'LED Bulb 9W', sales: 45, revenue: 20250 },
    { name: 'Extension Cord 5m', sales: 32, revenue: 72000 },
    { name: 'Switch 2-Gang', sales: 28, revenue: 35000 },
    { name: 'Socket 13A', sales: 25, revenue: 21250 },
    { name: 'USB Charger', sales: 22, revenue: 31900 }
  ];

  const categoryData = [
    { name: 'Bulbs', value: 45000, color: '#667eea' },
    { name: 'Wiring', value: 125000, color: '#764ba2' },
    { name: 'Switches', value: 35000, color: '#f093fb' },
    { name: 'Sockets', value: 28000, color: '#f5576c' }
  ];

  const recentSales = [
    {
      id: '1',
      invoiceNo: 'INV-001',
      customer: 'John Doe',
      total: 4500,
      status: 'completed' as const,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      invoiceNo: 'INV-002',
      customer: 'Jane Smith',
      total: 3200,
      status: 'completed' as const,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: '3',
      invoiceNo: 'INV-003',
      customer: 'Bob Johnson',
      total: 1800,
      status: 'pending' as const,
      createdAt: new Date(Date.now() - 172800000).toISOString()
    }
  ];

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8 p-6"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-300 mt-2">Welcome to VoltZone POS - Your business at a glance</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Stats Cards */}
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


