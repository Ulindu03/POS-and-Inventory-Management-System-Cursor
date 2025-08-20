import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'POS', path: '/pos' },
  { icon: Users, label: 'Customers', path: '/customers' },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="h-screen w-64 bg-black/30 backdrop-blur-xl border-r border-white/10 text-[#F8F8F8] hidden md:flex flex-col">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <BrandLogo size={56} rounded="xl" />
          <div>
            <div className="text-lg font-extrabold">VoltZone</div>
            <div className="text-xs opacity-70">POS</div>
          </div>
        </div>
      </div>
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                active ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};


