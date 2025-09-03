import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Package, Truck, FileText, Settings as SettingsIcon, Route, AlertTriangle, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { BrandLogo } from '@/components/common/BrandLogo';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'POS', path: '/pos' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: Package, label: 'Products', path: '/products' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: Truck, label: 'Suppliers', path: '/suppliers' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Route, label: 'Deliveries', path: '/deliveries' },
  { icon: AlertTriangle, label: 'Damages', path: '/damages' },
  { icon: SettingsIcon, label: 'Settings', path: '/settings' },
];

export const Sidebar = () => {
  const location = useLocation();
  const role = useAuthStore((s) => s.user?.role);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 32 } }
  };

  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring' as const, stiffness: 260, damping: 26 }}
      className="h-screen w-64 bg-black/30 backdrop-blur-xl border-r border-white/10 text-[#F8F8F8] hidden md:flex flex-col"
    >
      <motion.div className="px-5 py-6 border-b border-white/10" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex items-center gap-3">
          <BrandLogo size={56} rounded="xl" />
          <div>
            <div className="text-lg font-extrabold tracking-tight">VoltZone</div>
            <div className="text-xs opacity-70">POS</div>
          </div>
        </div>
      </motion.div>

      <motion.nav className="p-4 space-y-2" variants={containerVariants} initial="hidden" animate="show">
        {menuItems
          .filter((item) => {
            const allowUsers = item.path !== '/users' || role === 'admin';
            const allowSettings = item.path !== '/settings' || role === 'admin';
            const allowDeliveries = item.path !== '/deliveries' || (role === 'admin' || role === 'sales_rep');
            const allowDamages = item.path !== '/damages' || (role === 'admin' || role === 'sales_rep');
            return allowUsers && allowSettings && allowDeliveries && allowDamages;
          })
          .map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.path);
          return (
            <motion.div key={item.path} variants={itemVariants} layout className="relative group">
              {/* Animated active background pill that slides between items */}
              <AnimatePresence>
        {active && (
                  <motion.span
                    layoutId="activeNavPill"
                    className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          transition={{ type: 'spring' as const, stiffness: 500, damping: 40 }}
                  />
                )}
              </AnimatePresence>

              <Link
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-colors group ${
                  active ? 'text-white' : 'text-[#F8F8F8]/80 hover:text-white'
                }`}
              >
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      active ? 'text-indigo-400' : 'text-indigo-300/70 group-hover:text-indigo-300'
                    }`}
                  />
                  <span className="text-sm font-medium tracking-wide">{item.label}</span>
                </motion.span>
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>
    </motion.aside>
  );
};