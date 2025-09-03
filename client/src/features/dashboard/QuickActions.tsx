import { motion } from 'framer-motion';
import { 
  Plus, 
  // ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  Settings,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    title: 'New Sale',
    description: 'Start a new POS transaction',
    icon: <Plus className="w-6 h-6" />,
    href: '/pos',
    color: 'from-emerald-500 to-green-600'
  },
  {
    title: 'Add Product',
    description: 'Add new product to inventory',
    icon: <Package className="w-6 h-6" />,
    href: '/products',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    title: 'New Customer',
    description: 'Register a new customer',
    icon: <Users className="w-6 h-6" />,
    href: '/customers',
    color: 'from-purple-500 to-pink-600'
  },
  {
    title: 'View Reports',
    description: 'Generate business reports',
    icon: <FileText className="w-6 h-6" />,
    href: '/reports',
    color: 'from-orange-500 to-red-600'
  },
  {
    title: 'Analytics',
    description: 'Detailed business insights',
  icon: <BarChart3 className="w-6 h-6" />,
    href: '/analytics',
    color: 'from-teal-500 to-cyan-600'
  },
  {
    title: 'Settings',
    description: 'Configure system settings',
    icon: <Settings className="w-6 h-6" />,
    href: '/settings',
    color: 'from-slate-500 to-gray-600'
  }
];

export const QuickActions: React.FC = () => {
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Quick Actions</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              to={action.href}
              className={`block p-4 rounded-xl bg-gradient-to-br ${action.color} hover:shadow-xl transition-all duration-300 group border border-white/10`}
            >
              <div className="text-white text-center">
                <div className="mb-2 transform group-hover:scale-110 transition-transform duration-300">
                  {action.icon}
                </div>
                <h4 className="font-semibold text-sm mb-1">{action.title}</h4>
                <p className="text-xs opacity-90 font-medium">{action.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
