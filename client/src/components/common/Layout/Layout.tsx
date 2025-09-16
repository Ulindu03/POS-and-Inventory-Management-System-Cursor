// Main layout component that wraps all pages with sidebar and header
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string; // allow per-page background / layout overrides
}

export const AppLayout = ({ children, className = '' }: AppLayoutProps) => {
  // Track whether sidebar is open or closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

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


