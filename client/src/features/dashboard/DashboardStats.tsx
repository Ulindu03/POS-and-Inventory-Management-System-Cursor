import { motion } from 'framer-motion';
import { StatsCard } from '@/components/common/Card';
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
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
    >
      <StatsCard
        title="Total Sales"
        value={stats.totalSales.toLocaleString()}
        prefix="LKR "
        change={stats.monthlyGrowth}
        trend={stats.monthlyGrowth >= 0 ? 'up' : 'down'}
        icon={<DollarSign className="w-6 h-6" />}
      />
      
      <StatsCard
        title="Total Orders"
        value={stats.totalOrders.toLocaleString()}
        change={12}
        trend="up"
        icon={<ShoppingCart className="w-6 h-6" />}
      />
      
      <StatsCard
        title="Total Products"
        value={stats.totalProducts.toLocaleString()}
        change={5}
        trend="up"
        icon={<Package className="w-6 h-6" />}
      />
      
      <StatsCard
        title="Total Customers"
        value={stats.totalCustomers.toLocaleString()}
        change={8}
        trend="up"
        icon={<Users className="w-6 h-6" />}
      />
      
      <StatsCard
        title="Average Order Value"
        value={stats.averageOrderValue.toLocaleString()}
        prefix="LKR "
        change={-2}
        trend="down"
        icon={<TrendingUp className="w-6 h-6" />}
      />
      
      <StatsCard
        title="Active Sessions"
        value="24"
        change={15}
        trend="up"
        icon={<Activity className="w-6 h-6" />}
      />
    </motion.div>
  );
};
