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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
      case 'pending': return 'text-amber-700 bg-amber-100 border-amber-200';
      case 'cancelled': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Sales</h3>
      
      <div className="space-y-3">
        {sales.map((sale, index) => (
          <motion.div
            key={sale.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-300 border border-gray-200/50"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-semibold text-gray-900 text-sm">{sale.invoiceNo}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(sale.status)}`}>
                  {sale.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {sale.customer} • {new Date(sale.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-900 text-lg">{formatLKR(sale.total)}</div>
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
