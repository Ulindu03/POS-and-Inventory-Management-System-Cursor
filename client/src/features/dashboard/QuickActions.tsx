import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';
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
import { useTranslation } from 'react-i18next';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

const quickActions: (QuickAction & { allowedRoles?: string[]; titleKey: string; descKey: string })[] = [
  {
    title: 'New Sale',
    titleKey: 'dashboard.action_newSale_title',
    descKey: 'dashboard.action_newSale_desc',
    description: 'Start a new POS transaction',
    icon: <Plus className="w-6 h-6" />,
    href: '/pos',
    color: 'from-emerald-500 to-green-600',
  allowedRoles: ['store_owner','cashier','sales_rep']
  },
  {
    title: 'Add Product',
    titleKey: 'dashboard.action_addProduct_title',
    descKey: 'dashboard.action_addProduct_desc',
    description: 'Add new product to inventory',
    icon: <Package className="w-6 h-6" />,
    href: '/products',
    color: 'from-blue-500 to-indigo-600',
  allowedRoles: ['store_owner']
  },
  {
    title: 'New Customer',
    titleKey: 'dashboard.action_newCustomer_title',
    descKey: 'dashboard.action_newCustomer_desc',
    description: 'Register a new customer',
    icon: <Users className="w-6 h-6" />,
    href: '/customers',
    color: 'from-purple-500 to-pink-600',
  allowedRoles: ['store_owner','cashier','sales_rep']
  },
  {
    title: 'View Reports',
    titleKey: 'dashboard.action_viewReports_title',
    descKey: 'dashboard.action_viewReports_desc',
    description: 'Generate business reports',
    icon: <FileText className="w-6 h-6" />,
    href: '/reports',
    color: 'from-orange-500 to-red-600',
  allowedRoles: ['store_owner']
  },
  {
    title: 'Analytics',
    titleKey: 'dashboard.action_analytics_title',
    descKey: 'dashboard.action_analytics_desc',
    description: 'Detailed business insights',
  icon: <BarChart3 className="w-6 h-6" />,
    href: '/analytics',
    color: 'from-teal-500 to-cyan-600',
  allowedRoles: ['store_owner']
  },
  {
    title: 'Settings',
    titleKey: 'dashboard.action_settings_title',
    descKey: 'dashboard.action_settings_desc',
    description: 'Configure system settings',
    icon: <Settings className="w-6 h-6" />,
    href: '/settings',
    color: 'from-slate-500 to-gray-600',
  allowedRoles: ['store_owner']
  }
];

export const QuickActions: React.FC = () => {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const canonicalRole = role ? (String(role).toLowerCase() === 'admin' ? 'store_owner' : String(role).toLowerCase()) : undefined;
  const visibleActions = quickActions.filter(a => {
    if (!a.allowedRoles) return true;
    if (!canonicalRole) return false;
    return a.allowedRoles.includes(canonicalRole);
  });
  const gridCols = visibleActions.length <= 2
    ? 'grid-cols-1 sm:grid-cols-2 max-w-[1000px] mx-auto'
    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl">
  <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">{t('dashboard.quickActions')}</h3>

      <div className={`grid ${gridCols} gap-4`}>
        {visibleActions.map((action, index) => (
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
              className={`block p-4 rounded-xl bg-gradient-to-br ${action.color} hover:shadow-xl transition-all duration-300 group border border-white/10 overflow-hidden`}
            >
              <div className="text-white text-center">
                <div className="mb-2">
                  {action.icon}
                </div>
                <h4 className="font-semibold text-sm mb-1">{t(action.titleKey)}</h4>
                <p className="text-xs opacity-90 font-medium">{t(action.descKey)}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
