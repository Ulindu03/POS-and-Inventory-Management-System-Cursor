// Main layout component that wraps all pages with sidebar and header
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string; // allow per-page background / layout overrides
}

export const AppLayout = ({ children, className = '' }: AppLayoutProps) => {
  const STORAGE_KEY = 'vz_sidebar_open_v2';
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === '1') return true;
      if (raw === '0') return false;
      return false; // new default: always closed until user toggles
    } catch { return false; }
  });
  const location = useLocation();

  // Persist state on any change (all breakpoints now)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, sidebarOpen ? '1' : '0'); } catch {}
  }, [sidebarOpen]);

  // Auto-close on route change (navigation) if currently open
  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
  <div className={`min-h-screen w-full flex relative ${className}`}>
      {/* Sidebar navigation menu */}
  <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Main content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Top header with user info and controls */}
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} />
        {/* Page content area with responsive padding */}
        <main className="flex-1 overflow-hidden p-2 sm:p-3 text-[#F8F8F8]">
          {/* Container with max width for better readability on large screens */}
          <div className="max-w-screen-xl 2xl:max-w-screen-2xl mx-auto px-1 sm:px-3 lg:px-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};


