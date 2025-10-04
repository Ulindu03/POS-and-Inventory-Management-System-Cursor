// Sidebar navigation component with role-based menu items and smooth animations
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Package, Truck, FileText, Settings as SettingsIcon, Route, AlertTriangle, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { BrandLogo } from '@/components/common/BrandLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

// Define all navigation menu items with their permissions
const menuItems = [
  { icon: LayoutDashboard, imgSrc: '/dashboard.png', label: 'Dashboard', path: '/dashboard', allowedRoles: ['store_owner', 'cashier', 'sales_rep'] },
  { icon: ShoppingCart, imgSrc: '/POS.png', label: 'POS', path: '/pos', allowedRoles: ['store_owner', 'cashier', 'sales_rep'] },
  // Inventory - view only access for cashier and sales_rep
  { icon: Package, imgSrc: '/inventory.png', label: 'Inventory', path: '/inventory', allowedRoles: ['store_owner', 'cashier', 'sales_rep'] },
  // Products - view only access for cashier and sales_rep
  { icon: Package, imgSrc: '/product.png', label: 'Products', path: '/products', allowedRoles: ['store_owner', 'cashier', 'sales_rep'] },
  { icon: Users, imgSrc: '/customer.png', label: 'Customers', path: '/customers', allowedRoles: ['store_owner', 'cashier', 'sales_rep'] },
  // Suppliers - no access for cashier and sales_rep
  { icon: Truck, imgSrc: '/supplier.png', label: 'Suppliers', path: '/suppliers', allowedRoles: ['store_owner'] },
  // Reports - own sales reports only for cashier and sales_rep
  { icon: FileText, imgSrc: '/report.png', label: 'Reports', path: '/reports', allowedRoles: ['store_owner', 'cashier', 'sales_rep'] },
  // Analytics - no access for cashier and sales_rep
  { icon: BarChart3, imgSrc: '/analytics.png', label: 'Analytics', path: '/analytics', allowedRoles: ['store_owner'] },
  // Deliveries - can mark as completed for cashier and sales_rep
  { icon: Route, imgSrc: '/deliveries.png', label: 'Deliveries', path: '/deliveries', allowedRoles: ['store_owner', 'cashier', 'sales_rep'] },
  // Damages - can record damaged items for cashier and sales_rep
  { icon: AlertTriangle, imgSrc: '/damages.png', label: 'Damages', path: '/damages', allowedRoles: ['store_owner', 'cashier', 'sales_rep'] },
  // Warranty - can accept warranty claims for cashier and sales_rep
  { icon: FileText, imgSrc: '/warranty.png', label: 'Warranty', path: '/warranty', allowedRoles: ['store_owner', 'cashier', 'sales_rep'] },
  // Returns - can process customer returns for cashier and sales_rep
  { icon: FileText, imgSrc: '/returns.svg', label: 'Returns', path: '/returns', allowedRoles: ['store_owner', 'cashier', 'sales_rep', 'manager'] },
  // Only admin can see Users and Settings panels
  { icon: Users, imgSrc: '/user.png', label: 'Users', path: '/users', allowedRoles: ['store_owner'] },
  { icon: SettingsIcon, imgSrc: '/settings.png', label: 'Settings', path: '/settings', allowedRoles: ['store_owner'] },
];

export const Sidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  // Get current page location and user role for filtering menu items
  const location = useLocation();
  const role = useAuthStore((s) => s.user?.role);
  // Sidebar now fully controlled by parent for all breakpoints (no desktop pinning)

  // Normalize role (case-insensitive) and map legacy/alias roles
  const normalized = role ? role.toLowerCase() : undefined;
  const effectiveRole = normalized === 'admin' ? 'store_owner' : normalized;

  // Safe fallback subset (always allowed) used if filtering returns zero items
  const fallbackLabels = new Set(['Dashboard', 'POS', 'Inventory', 'Products', 'Customers', 'Reports']);
  const fallbackItems = menuItems.filter(mi => fallbackLabels.has(mi.label));

  // Animation variants for staggered menu item appearance
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

  // Listen for ESC key to close sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Mobile overlay and sliding sidebar */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="sidebar-scrim"
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Drawer: animated sidebar on all viewports */}
      <motion.aside
        key="sidebar-panel"
        className="fixed left-0 top-0 bottom-0 z-50 w-56 lg:w-64 bg-black/30 backdrop-blur-xl border-r border-white/10 text-[#F8F8F8] flex flex-col"
        initial={false}
        animate={{ x: open ? 0 : -300, opacity: open ? 1 : 0.6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        aria-label="Navigation"
      >
      {/* Company logo and branding section */}
      <motion.div className="px-5 py-6 border-b border-white/10" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex items-center gap-3">
          <BrandLogo size={48} rounded="xl" />
          <div>
            <div className="text-base lg:text-lg font-extrabold tracking-tight">VoltZone</div>
            <div className="text-[11px] lg:text-xs opacity-70">POS</div>
          </div>
        </div>
      </motion.div>

    {/* Navigation menu with role-based filtering + guaranteed fallback
      Added scroll container (overflow-y-auto) and hidden scrollbar styling. */}
    <motion.nav className="p-4 space-y-2 flex-1 min-h-0 overflow-y-auto scrollbar-hide" variants={containerVariants} initial="hidden" animate="show">
        {(function resolveMenu() {
          const filtered = menuItems.filter((item: any) => {
            if (item.allowedRoles) {
              return effectiveRole ? item.allowedRoles.includes(effectiveRole) : false;
            }
            if (item.adminOnly && effectiveRole !== 'store_owner') return false; // after normalization
            return true;
          });
          const list = filtered.length > 0 ? filtered : fallbackItems;
          return list;
        })().map((item) => {
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

              {/* Navigation link with icon and label */}
              <Link
                to={item.path}
                onClick={() => { onClose(); }}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-colors group ${
                  active ? 'text-white' : 'text-[#F8F8F8]/80 hover:text-white'
                }`}
              >
        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-3">
                  {/* Use custom image if available, otherwise use Lucide icon */}
                  {item.imgSrc ? (
                    <img
                      src={item.imgSrc}
                      alt={item.label}
            className={`w-[22px] h-[22px] object-contain ${active ? '' : 'opacity-80 group-hover:opacity-100'}`}
                      draggable={false}
                    />
                  ) : (
                    <Icon
            className={`w-[22px] h-[22px] transition-colors ${
                        active ? 'text-indigo-400' : 'text-indigo-300/70 group-hover:text-indigo-300'
                      }`}
                    />
                  )}
          <span className="text-base font-medium tracking-wide">{item.label}</span>
                </motion.span>
              </Link>
            </motion.div>
          );
        })}
  </motion.nav>
  <style>{`.scrollbar-hide{scrollbar-width:none;} .scrollbar-hide::-webkit-scrollbar{display:none;}`}</style>
    </motion.aside>
    </>
  );
};