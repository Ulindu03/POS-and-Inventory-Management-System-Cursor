import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Package, Users, DollarSign, Activity } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalSales: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    monthlyGrowth: number;
    averageOrderValue: number;
  };
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  // Simple progress ratios (mocked for UI feel)
  const ratios = {
    sales: Math.min(1, stats.totalSales / 2000000),
    orders: Math.min(1, stats.totalOrders / 1000),
    products: Math.min(1, stats.totalProducts / 500),
    customers: Math.min(1, stats.totalCustomers / 500),
    aov: Math.min(1, stats.averageOrderValue / 10000),
    growth: Math.min(1, Math.abs(stats.monthlyGrowth) / 100)
  };

  const base = 'group relative overflow-hidden rounded-2xl border transition-all duration-300';

  const cards = [
    {
      key: 'sales',
      title: 'Total Sales',
      value: `LKR ${stats.totalSales.toLocaleString()}`,
      color: 'indigo',
      ratio: ratios.sales,
      icon: <DollarSign className="w-6 h-6 text-indigo-400" />,
      from: 'from-indigo-500/10 to-indigo-600/5',
      border: 'border-indigo-500/20 hover:border-indigo-400/30',
      track: 'bg-indigo-500/30',
      fill: 'from-indigo-500 to-indigo-400'
    },
    {
      key: 'orders',
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      color: 'blue',
      ratio: ratios.orders,
      icon: <ShoppingCart className="w-6 h-6 text-blue-400" />,
      from: 'from-blue-500/10 to-blue-600/5',
      border: 'border-blue-500/20 hover:border-blue-400/30',
      track: 'bg-blue-500/30',
      fill: 'from-blue-500 to-blue-400'
    },
    {
      key: 'products',
      title: 'Total Products',
      value: stats.totalProducts.toLocaleString(),
      color: 'yellow',
      ratio: ratios.products,
      icon: <Package className="w-6 h-6 text-yellow-400" />,
      from: 'from-yellow-500/10 to-yellow-600/5',
      border: 'border-yellow-500/20 hover:border-yellow-400/30',
      track: 'bg-yellow-500/30',
      fill: 'from-yellow-500 to-yellow-400'
    },
    {
      key: 'customers',
      title: 'Total Customers',
      value: stats.totalCustomers.toLocaleString(),
      color: 'purple',
      ratio: ratios.customers,
      icon: <Users className="w-6 h-6 text-purple-400" />,
      from: 'from-purple-500/10 to-purple-600/5',
      border: 'border-purple-500/20 hover:border-purple-400/30',
      track: 'bg-purple-500/30',
      fill: 'from-purple-500 to-purple-400'
    },
    {
      key: 'aov',
      title: 'Average Order Value',
      value: `LKR ${stats.averageOrderValue.toLocaleString()}`,
      color: 'pink',
      ratio: ratios.aov,
      icon: <TrendingUp className="w-6 h-6 text-pink-400" />,
      from: 'from-pink-500/10 to-pink-600/5',
      border: 'border-pink-500/20 hover:border-pink-400/30',
      track: 'bg-pink-500/30',
      fill: 'from-pink-500 to-pink-400'
    },
    {
      key: 'growth',
      title: 'Monthly Growth',
      value: `${stats.monthlyGrowth}%`,
      color: 'emerald',
      ratio: ratios.growth,
      icon: <Activity className="w-6 h-6 text-emerald-400" />,
      from: 'from-emerald-500/10 to-emerald-600/5',
      border: 'border-emerald-500/20 hover:border-emerald-400/30',
      track: 'bg-emerald-500/30',
      fill: 'from-emerald-500 to-emerald-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((c, i) => (
        <motion.div
          key={c.key}
          initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 * i }}
          className={`${base} bg-gradient-to-br ${c.from} ${c.border}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-6 flex flex-col h-full">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-medium text-gray-300 mb-3">{c.title}</p>
                <p className="text-2xl font-bold text-white tracking-tight">{c.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${c.color}-500/20`}>{c.icon}</div>
            </div>
            <div className={`h-1 w-full ${c.track} rounded-full overflow-hidden mt-auto`}>
              <div
                className={`h-full rounded-full bg-gradient-to-r ${c.fill}`}
                style={{ width: `${Math.max(8, c.ratio * 100)}%` }}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
