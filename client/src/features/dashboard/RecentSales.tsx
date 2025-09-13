import { GlassCard } from '@/components/common/Card';
import { motion } from 'framer-motion';
import { formatLKR } from '@/lib/utils/currency';

interface Sale {
  id: string;
  invoiceNo: string;
  customer: string;
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
}

interface RecentSalesProps {
  sales: Sale[];
}

export const RecentSales: React.FC<RecentSalesProps> = ({ sales }) => {
  const items = Array.isArray(sales) ? sales.slice(0, 5) : [];
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
      case 'pending': return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
      case 'cancelled': return 'text-red-300 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-300 bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <GlassCard variant="darkSubtle" className="p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4 tracking-wide">Recent Sales</h3>
      
      <div className="space-y-3">
        {items.map((sale, index) => (
          <motion.div
            key={sale.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-white/5 to-white/0 hover:from-white/10 hover:to-white/5 transition-all duration-300 border border-white/10 backdrop-blur-sm"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-semibold text-gray-100 text-sm">{sale.invoiceNo}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(sale.status)}`}>
                  {sale.status}
                </span>
              </div>
              <div className="text-sm text-gray-400 font-medium">
                {sale.customer} • {new Date(sale.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-white text-lg">{formatLKR(sale.total)}</div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {sales.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No recent sales to display
        </div>
      )}
    </GlassCard>
  );
};
